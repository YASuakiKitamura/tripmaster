import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  listTrips,
  createDomestic,
  writesEnabled,
  validId,
  type CreateInput,
} from "@/app/lib/adminTrips";

export const runtime = "nodejs";

// 旅データ JSON の一覧取得(GET) / 新規作成(POST)。いずれも認証必須。
// 書き込みは writesEnabled()（=ローカル/Docker）でのみ許可。本番は閲覧のみ。

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({
    writesEnabled: writesEnabled(),
    trips: await listTrips(),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!writesEnabled()) {
    return NextResponse.json(
      { error: "本番環境ではファイルを書き込めません（閲覧のみ）。編集はローカル/Dockerで行ってください。" },
      { status: 503 },
    );
  }

  const body = (await req.json().catch(() => null)) as Partial<CreateInput> | null;
  if (!body?.id || !validId(body.id)) {
    return NextResponse.json(
      { error: "id は英小文字・数字・ハイフンのみ（例: kyoto-2027）" },
      { status: 400 },
    );
  }

  try {
    const meta = await createDomestic({
      id: body.id,
      name: body.name ?? "",
      destination: body.destination ?? "",
      emoji: body.emoji ?? "",
      dateLabel: body.dateLabel ?? "",
      teaser: body.teaser,
      status: body.status,
    });
    return NextResponse.json({ ok: true, meta }, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "作成に失敗しました";
    const status = message.includes("既に存在") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
