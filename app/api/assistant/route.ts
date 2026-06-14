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

function perspectiveNote(p?: string): string {
  return PERSPECTIVE_NOTE[p ?? "混合"] ?? "";
}

type CreateParams = Anthropic.MessageCreateParamsNonStreaming;

/**
 * 3モードで共通の Claude 呼び出し。system に旅コンテキストを連結し、
 * 単一ユーザーメッセージを投げてテキストを返す。差分（トークン量・thinking・
 * output_config・プロンプト）だけ呼び出し側で指定する。
 */
async function ask(opts: {
  trip: ResolvedTrip;
  system: string;
  user: string;
  maxTokens: number;
  thinking: CreateParams["thinking"];
  outputConfig: CreateParams["output_config"];
}): Promise<string> {
  const message = await anthropic.messages.create({
    model: MODEL,
    max_tokens: opts.maxTokens,
    thinking: opts.thinking,
    output_config: opts.outputConfig,
    system: `${opts.system}\n\n${buildTripContext(opts.trip)}`,
    messages: [{ role: "user", content: opts.user }],
  });
  return extractText(message);
}

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
    if (body.mode === "edit") {
      return NextResponse.json(await edit(trip, body));
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
    currentTime?: string | null;
    minsToNext?: number | null;
    current?: { title: string; end: string; who: string } | null;
    prev?: { title: string; time: string } | null;
    next?: { title: string; time: string; who: string; notes: string } | null;
    following?: { title: string; time: string }[] | null;
  },
): Promise<string> {
  if (!body.next) return "";
  const persp = perspectiveNote(body.perspective);

  // 現在の局面を文章で整理してモデルに渡す（ライブな状況判断のため）
  const mins = body.minsToNext;
  const situation =
    typeof mins !== "number"
      ? "次の予定までの時間は不明"
      : mins <= 0
        ? `次の予定の開始予定時刻を${-mins}分過ぎている（押し気味・巻きが必要かも）`
        : mins <= 10
          ? `次の予定まであと約${mins}分（そろそろ動き出すタイミング）`
          : mins <= 30
            ? `次の予定まであと約${mins}分（もうすぐ）`
            : `次の予定まであと約${mins}分（まだ余裕あり）`;
  const followingLine =
    body.following && body.following.length
      ? body.following.map((f) => `${f.time} ${f.title}`).join(" → ")
      : "（なし）";

  return ask({
    trip,
    maxTokens: 400,
    thinking: { type: "disabled" },
    outputConfig: { effort: "low" },
    system:
      `あなたは旅に同行する、親しみやすくテンポの良い日本語のトラベルコンシェルジュです。` +
      `いまの状況（進行中の予定・次までの残り時間・押し/余裕）を踏まえ、「次にやること」へ自然につなぐ` +
      `2〜3文のライブな案内を書いてください。状況に合わせて口調を変える：` +
      `①進行中の予定があるなら、それを切り上げて次へ移る橋渡しを。` +
      `②残り時間がわずか/超過なら、急ぎ・巻きを優しく促す。③余裕があるなら、ゆったり楽しむ提案や合間の小ネタを。` +
      `絵文字を1〜2個だけ自然に使ってOK。命令口調ではなく、隣で寄り添うトーンで。` +
      `備考に実用的な注意点（締切・出口・決済・移動・暑さ等）があれば1つだけ自然に織り込む。` +
      `見出しや箇条書き、前置き(「はい」「了解」等)は不要。最終的な案内文だけを出力してください。`,
    user:
      `${persp}、次のToDoカードの案内文を書いてください。\n` +
      `現在時刻: ${body.currentTime ?? "不明"}\n` +
      `いまの状況: ${situation}\n` +
      `進行中の予定: ${
        body.current
          ? `${body.current.title}（〜${body.current.end}・担当 ${body.current.who}）`
          : "（特になし／予定の合間）"
      }\n` +
      `直前に終えた予定: ${body.prev ? `${body.prev.time} ${body.prev.title}` : "（なし）"}\n` +
      `次にやること: ${body.next.time} ${body.next.title}（担当: ${body.next.who}）\n` +
      `備考: ${body.next.notes}\n` +
      `その後の流れ: ${followingLine}`,
  });
}

// 旅程編集モード: 変更内容を受け取り「操作リスト(ops)」だけを構造化出力で返す。
// 全文JSONを再生成しないので入出力ともトークンが小さい。適用はクライアント側。
const EDIT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: {
      type: "string",
      description: "変更内容の一言サマリ（日本語・1文）。間に合わない懸念があれば必ず触れる。",
    },
    ops: {
      type: "array",
      description: "旅程への操作。変わるフィールドだけを最小限に含める。",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          op: { type: "string", enum: ["add", "update", "remove"] },
          id: {
            type: "string",
            description: "update/remove の対象カードid。既存カードのidを正確に使う。",
          },
          title: { type: "string" },
          emoji: { type: "string", description: "絵文字1つ" },
          who: { type: "string", description: "担当（既存の値に合わせる）" },
          notes: { type: "string" },
          start: { type: "string", description: "開始 HH:MM" },
          end: { type: "string", description: "終了 HH:MM" },
          date: { type: "string", description: "YYYY-MM-DD（当日のみなら省略可）" },
          after: {
            type: "string",
            description: "add時の並び順ヒント。直後に置きたい既存カードのid。",
          },
        },
        required: ["op"],
      },
    },
  },
  required: ["summary", "ops"],
} as const;

async function edit(
  trip: ResolvedTrip,
  body: {
    change?: string;
    currentTime?: string;
    perspective?: string;
    itinerary?: { id: string; start: string; end: string; who: string; title: string }[];
  },
): Promise<{ summary: string; ops: unknown[] }> {
  const change = (body.change ?? "").slice(0, 1000);
  if (!change.trim()) return { summary: "", ops: [] };
  const persp = perspectiveNote(body.perspective);
  const list = (body.itinerary ?? [])
    .slice(0, 40)
    .map((it) => `${it.id} | ${it.start}-${it.end} [${it.who}] ${it.title}`)
    .join("\n");

  const raw = await ask({
    trip,
    maxTokens: 1500,
    thinking: { type: "adaptive" },
    outputConfig: {
      effort: "medium",
      format: { type: "json_schema", schema: EDIT_SCHEMA },
    },
    system:
      `あなたは旅程エディタです。利用者の変更要望を、現在の旅程に対する最小限の「操作リスト」に変換します。` +
      `操作は add（新規追加）/ update（既存カードの一部変更）/ remove（削除）の3種。` +
      `既存カードを変えるときは必ず正しい id を指定し、変わるフィールドだけ含める（時刻だけ変えるなら start/end だけ）。` +
      `この旅の最重要制約（最終便/最終列車）を必ず守り、間に合わない恐れがあれば summary で警告する。` +
      `現実的でない時刻にしない。who は既存の値に合わせる。余計な操作はしない。`,
    user:
      `${persp}以下の変更を反映する操作リストを作ってください。\n` +
      `現在時刻: ${body.currentTime ?? "不明"}\n` +
      `変更・状況: ${change}\n\n` +
      `現在の旅程（id | 時刻 | 担当 | 内容）:\n${list || "（情報なし）"}`,
  });

  try {
    const parsed = JSON.parse(raw) as { summary?: string; ops?: unknown[] };
    return { summary: parsed.summary ?? "", ops: Array.isArray(parsed.ops) ? parsed.ops : [] };
  } catch {
    return { summary: "提案の解釈に失敗しました。表現を変えて再度お試しください。", ops: [] };
  }
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
  const persp = perspectiveNote(body.perspective);
  const remaining = (body.remaining ?? [])
    .slice(0, 30)
    .map((it) => `${it.time} [${it.who}] ${it.title}`)
    .join("\n");

  return ask({
    trip,
    maxTokens: 1200,
    thinking: { type: "adaptive" },
    outputConfig: { effort: "high" },
    system:
      `あなたは旅のトラベルコンシェルジュ兼リスク管理役です。` +
      `旅行中の予定変更を伝えられたら、残りの行程をどう組み直すかを日本語で提案します。` +
      `この旅の最重要制約（最終便/最終列車など）を必ず守ること。間に合わない恐れがあれば必ず警告する。` +
      `出力は、(1)ひとことの状況整理 → (2)具体的な組み直し案を「・」で3〜5項目（時刻の目安つき） → (3)最終便/最終列車に影響するなら必ず警告、の順。` +
      `温かく実践的に、簡潔に。Markdownの見出しや太字は使わず、プレーンテキストと「・」だけで。前置きは不要。`,
    user:
      `${persp}予定を組み直してください。\n` +
      `現在時刻: ${body.currentTime ?? "不明"}\n` +
      `変更・状況: ${change}\n\n` +
      `残りの予定:\n${remaining || "（情報なし）"}`,
  });
}
