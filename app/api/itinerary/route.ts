import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { kvGet, kvSet, kvConfigured } from "@/app/lib/kv";
import { emptyOverlay, type ItineraryOverlay } from "@/app/lib/itinerary";

export const runtime = "nodejs";

// 旅程オーバーレイの共有ストア。GET=取得 / PUT=保存。いずれも認証必須。
// KV未設定でも 200 を返し configured:false を伝える（クライアントは localStorage で動作継続）。

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const tripId = new URL(req.url).searchParams.get("tripId");
  if (!tripId) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  const configured = kvConfigured();
  const overlay = configured
    ? await kvGet<ItineraryOverlay>(tripId)
    : null;
  return NextResponse.json({ configured, overlay });
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!kvConfigured()) {
    // 保存先が無いので localStorage に任せる。クライアントは握りつぶしてよい。
    return NextResponse.json({ configured: false });
  }

  const body = (await req.json().catch(() => null)) as
    | { tripId?: string; overlay?: ItineraryOverlay }
    | null;
  const tripId = body?.tripId;
  const incoming = body?.overlay;
  if (!tripId || !incoming || typeof incoming.rev !== "number") {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // 楽観ロック: サーバ側が進んでいたら衝突を返し、クライアントに再取得を促す。
  const current = await kvGet<ItineraryOverlay>(tripId);
  if (current && current.rev > incoming.rev) {
    return NextResponse.json(
      { configured: true, conflict: true, overlay: current },
      { status: 409 },
    );
  }

  const stored: ItineraryOverlay = { ...emptyOverlay(), ...incoming };
  await kvSet(tripId, stored);
  return NextResponse.json({ configured: true, overlay: stored });
}
