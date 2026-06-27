import { NextResponse } from "next/server";
import { auth } from "@/auth";
import {
  readTrip,
  writeTrip,
  deleteTrip,
  listTrips,
  writesEnabled,
  validId,
} from "@/app/lib/adminTrips";

export const runtime = "nodejs";

// 旅データ JSON 単体の取得(GET) / 更新(PUT) / 削除(DELETE)。認証必須。
// 書き込み(PUT/DELETE)は writesEnabled() でのみ許可。

type Ctx = { params: Promise<{ id: string }> };

async function requireUser() {
  const session = await auth();
  return !!session?.user;
}

const unauthorized = () =>
  NextResponse.json({ error: "unauthorized" }, { status: 401 });

const readOnly = () =>
  NextResponse.json(
    { error: "本番環境ではファイルを書き込めません（閲覧のみ）。編集はローカル/Dockerで行ってください。" },
    { status: 503 },
  );

export async function GET(_req: Request, { params }: Ctx) {
  if (!(await requireUser())) return unauthorized();
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const json = await readTrip(id);
  if (json === null) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json({ id, json });
}

export async function PUT(req: Request, { params }: Ctx) {
  if (!(await requireUser())) return unauthorized();
  if (!writesEnabled()) return readOnly();
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const body = (await req.json().catch(() => null)) as { json?: string } | null;
  if (typeof body?.json !== "string") {
    return NextResponse.json({ error: "json が必要です" }, { status: 400 });
  }
  try {
    await writeTrip(id, body.json);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "保存に失敗しました";
    return NextResponse.json({ error: `JSON が不正です: ${message}` }, { status: 400 });
  }
}

export async function DELETE(_req: Request, { params }: Ctx) {
  if (!(await requireUser())) return unauthorized();
  if (!writesEnabled()) return readOnly();
  const { id } = await params;
  if (!validId(id)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const info = (await listTrips()).find((t) => t.id === id);
  if (!info || (!info.hasFile && !info.registered)) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  // 組み込み旅（resolveTrip.ts に手書き import されている）はコードを壊さないため自動削除しない。
  if (info.registered && !info.managed) {
    return NextResponse.json(
      {
        error:
          "組み込みの旅（seoul/himeji/okinawa 等）は resolveTrip.ts で直接 import されています。削除はコードを手動で編集してください。",
      },
      { status: 409 },
    );
  }
  try {
    await deleteTrip(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "削除に失敗しました";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
