import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { auth } from "@/auth";
import { anthropic, MODEL, extractText } from "@/app/lib/anthropic";
import { resolveTrip, DEFAULT_TRIP_ID, type ResolvedTrip } from "@/app/lib/resolveTrip";

export const runtime = "nodejs";
export const maxDuration = 30;

// 正規化済みの旅データからClaude向けの共通コンテキストを作る
function buildTripContext(t: ResolvedTrip): string {
  const o = t.legs.outbound;
  const r = t.legs.return;
  return [
    `旅: ${t.title}（${t.dateLabel}）`,
    t.summary ? `概要: ${t.summary}` : "",
    `旅行者: ${t.travelers.map((x) => x.name).join("・")}`,
    `往路: ${o.emoji}${o.name} ${o.fromLabel}${o.fromTime}→${o.toLabel}${o.toTime}`,
    `復路: ${r.emoji}${r.name} ${r.fromLabel}${r.fromTime}→${r.toLabel}${r.toTime}${
      r.isLast ? "（最終・乗り遅れると当日帰宅困難）" : ""
    }`,
    `最重要警告: ${t.emergency.warning.title}。${t.emergency.warning.note}`,
    `決済方針: ${t.payment.strategy}`,
  ]
    .filter(Boolean)
    .join("\n");
}

const PERSPECTIVE_NOTE: Record<string, string> = {
  混合: "全体の視点で",
  "夫婦＋靖晃": "靖晃（夫）の動き（夫婦の共同予定を含む）の視点で",
  "夫婦＋ひとみ": "ひとみ（妻）の動き（夫婦の共同予定を含む）の視点で",
};

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body.mode !== "string") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const trip = resolveTrip(
    typeof body.tripId === "string" ? body.tripId : DEFAULT_TRIP_ID,
  );

  try {
    if (body.mode === "next-todo") {
      return NextResponse.json({ text: await nextTodo(trip, body) });
    }
    if (body.mode === "replan") {
      return NextResponse.json({ text: await replan(trip, body) });
    }
    return NextResponse.json({ error: "unknown mode" }, { status: 400 });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error("Anthropic API error", err.status, err.message);
      return NextResponse.json(
        { error: "ai_error", status: err.status },
        { status: 502 },
      );
    }
    console.error(err);
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
}

async function nextTodo(
  trip: ResolvedTrip,
  body: {
    perspective?: string;
    prev?: { title: string; time: string } | null;
    next?: { title: string; time: string; who: string; notes: string } | null;
    following?: { title: string; time: string } | null;
  },
): Promise<string> {
  if (!body.next) return "";
  const persp = PERSPECTIVE_NOTE[body.perspective ?? "混合"] ?? "";

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 400,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    system:
      `あなたは旅に同行する、親しみやすくテンポの良い日本語のトラベルコンシェルジュです。` +
      `「次にやること」を、直前の流れを踏まえて2〜3文のフレンドリーな案内にしてください。` +
      `絵文字を1〜2個だけ自然に使ってOK。命令口調ではなく、隣で寄り添うトーンで。` +
      `備考に実用的な注意点（締切・出口・決済・移動・暑さ等）があれば1つだけ自然に織り込む。` +
      `見出しや箇条書き、前置き(「はい」「了解」等)は不要。最終的な案内文だけを出力してください。\n\n` +
      buildTripContext(trip),
    messages: [
      {
        role: "user",
        content:
          `${persp}、次のToDoカードの案内文を書いてください。\n` +
          `直前: ${body.prev ? `${body.prev.time} ${body.prev.title}` : "（まだ開始前）"}\n` +
          `次にやること: ${body.next.time} ${body.next.title}（担当: ${body.next.who}）\n` +
          `備考: ${body.next.notes}\n` +
          `その次: ${body.following ? `${body.following.time} ${body.following.title}` : "（なし）"}`,
      },
    ],
  });
  return extractText(message);
}

async function replan(
  trip: ResolvedTrip,
  body: {
    change?: string;
    currentTime?: string;
    perspective?: string;
    remaining?: { time: string; who: string; title: string }[];
  },
): Promise<string> {
  const change = (body.change ?? "").slice(0, 1000);
  if (!change.trim()) return "";
  const persp = PERSPECTIVE_NOTE[body.perspective ?? "混合"] ?? "";
  const remaining = (body.remaining ?? [])
    .slice(0, 30)
    .map((it) => `${it.time} [${it.who}] ${it.title}`)
    .join("\n");

  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    thinking: { type: "adaptive" },
    output_config: { effort: "high" },
    system:
      `あなたは旅のトラベルコンシェルジュ兼リスク管理役です。` +
      `旅行中の予定変更を伝えられたら、残りの行程をどう組み直すかを日本語で提案します。` +
      `この旅の最重要制約（最終便/最終列車など）を必ず守ること。間に合わない恐れがあれば必ず警告する。` +
      `出力は、(1)ひとことの状況整理 → (2)具体的な組み直し案を「・」で3〜5項目（時刻の目安つき） → (3)最終便/最終列車に影響するなら必ず警告、の順。` +
      `温かく実践的に、簡潔に。Markdownの見出しや太字は使わず、プレーンテキストと「・」だけで。前置きは不要。\n\n` +
      buildTripContext(trip),
    messages: [
      {
        role: "user",
        content:
          `${persp}予定を組み直してください。\n` +
          `現在時刻: ${body.currentTime ?? "不明"}\n` +
          `変更・状況: ${change}\n\n` +
          `残りの予定:\n${remaining || "（情報なし）"}`,
      },
    ],
  });
  return extractText(message);
}
