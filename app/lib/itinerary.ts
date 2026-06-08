// 当日の旅程変更を「静的ベースJSON ＋ 差分オーバーレイ」で扱う仕組み。
// ベース(resolveTripのitinerary)は不変。ユーザ/AIの編集は overlay として
// 追加(added)・上書き(updated)・削除(removed) の差分だけ持ち、表示時に合成する。
// 純データ層（クライアント/サーバ両方から import 可能）。
import type { ItineraryItem, Who } from "./types";
import { itineraryStartMs, itineraryEndMs } from "./data";

/** baseカードへの部分上書き。time も部分指定できる。 */
export type ItemPatch = Partial<Omit<ItineraryItem, "time">> & {
  time?: Partial<ItineraryItem["time"]>;
};

/** 1旅ぶんの編集差分。KV と localStorage に保存する単位。 */
export interface ItineraryOverlay {
  rev: number; // 楽観ロック用リビジョン（2台同期の競合検出）
  updatedAt: string; // ISO
  added: ItineraryItem[]; // 新規カード（id は "x-..." 形式）
  updated: Record<string, ItemPatch>; // baseカードの部分上書き
  removed: string[]; // 非表示にする base / added の id
}

/** AI・手動編集が生成する操作。フラットなので JSON Schema と相性が良い。 */
export interface EditOp {
  op: "add" | "update" | "remove";
  id?: string; // update/remove の対象。add では任意（指定なければ自動採番）
  title?: string;
  emoji?: string;
  who?: string;
  notes?: string;
  start?: string; // "HH:MM"
  end?: string; // "HH:MM"
  date?: string; // "YYYY-MM-DD"
  after?: string; // add の並び順ヒント（このカードの直後に置きたい）
}

export function emptyOverlay(): ItineraryOverlay {
  return { rev: 0, updatedAt: "", added: [], updated: {}, removed: [] };
}

export function isEmptyOverlay(o: ItineraryOverlay | null | undefined): boolean {
  return (
    !o ||
    (o.added.length === 0 &&
      o.removed.length === 0 &&
      Object.keys(o.updated).length === 0)
  );
}

function genId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `x-${rand}`;
}

function byStart(a: ItineraryItem, b: ItineraryItem): number {
  return itineraryStartMs(a) - itineraryStartMs(b);
}

/** ベース＋オーバーレイを合成して時刻順に並べた最終的な旅程を返す。 */
export function applyOverlay(
  base: ItineraryItem[],
  overlay: ItineraryOverlay | null | undefined,
): ItineraryItem[] {
  if (isEmptyOverlay(overlay)) return [...base].sort(byStart);
  const o = overlay!;
  const removed = new Set(o.removed);
  const merged = base
    .filter((it) => !removed.has(it.id))
    .map((it) => {
      const patch = o.updated[it.id];
      if (!patch) return it;
      return {
        ...it,
        ...patch,
        time: { ...it.time, ...(patch.time ?? {}) },
      } as ItineraryItem;
    });
  const added = o.added.filter((it) => !removed.has(it.id));
  return [...merged, ...added].sort(byStart);
}

function cloneOverlay(o: ItineraryOverlay): ItineraryOverlay {
  return {
    rev: o.rev,
    updatedAt: o.updatedAt,
    added: o.added.map((it) => ({ ...it, time: { ...it.time } })),
    updated: Object.fromEntries(
      Object.entries(o.updated).map(([k, v]) => [
        k,
        { ...v, time: v.time ? { ...v.time } : undefined },
      ]),
    ),
    removed: [...o.removed],
  };
}

/** EditOp の time 系フィールドを Partial<ItineraryItem> に畳み込む。 */
function timePatch(op: EditOp): Partial<ItineraryItem["time"]> {
  const t: Partial<ItineraryItem["time"]> = {};
  if (op.start !== undefined) t.start = op.start;
  if (op.end !== undefined) t.end = op.end;
  if (op.date !== undefined) t.date = op.date;
  return t;
}

function fieldPatch(op: EditOp): ItemPatch {
  const p: ItemPatch = {};
  if (op.title !== undefined) p.title = op.title;
  if (op.emoji !== undefined) p.emoji = op.emoji;
  if (op.who !== undefined) p.who = op.who as Who;
  if (op.notes !== undefined) p.notes = op.notes;
  const t = timePatch(op);
  if (Object.keys(t).length) p.time = t;
  return p;
}

function buildNewItem(op: EditOp, base: ItineraryItem[]): ItineraryItem {
  const ref = op.after ? base.find((b) => b.id === op.after) : undefined;
  const tz = ref?.time.tz ?? base[0]?.time.tz ?? "Asia/Seoul";
  const date = op.date ?? ref?.time.date ?? base[0]?.time.date;
  const start = op.start ?? "12:00";
  return {
    id: op.id || genId(),
    time: { start, end: op.end ?? start, tz, ...(date ? { date } : {}) },
    who: (op.who as Who) ?? "夫婦",
    emoji: op.emoji ?? "📝",
    title: op.title ?? "新しい予定",
    notes: op.notes ?? "",
  };
}

/**
 * 操作列をオーバーレイに畳み込んで新しいオーバーレイを返す（純関数）。
 * AI提案の適用と手動編集の両方で使う。base は新規カードの既定値補完に使う。
 */
export function applyOps(
  base: ItineraryItem[],
  overlay: ItineraryOverlay,
  ops: EditOp[],
  nowIso: string,
): ItineraryOverlay {
  const next = cloneOverlay(overlay);
  for (const op of ops) {
    if (op.op === "remove") {
      if (!op.id) continue;
      const addedIdx = next.added.findIndex((a) => a.id === op.id);
      if (addedIdx !== -1) {
        next.added.splice(addedIdx, 1); // 新規カードは差分から消すだけ
      } else {
        if (!next.removed.includes(op.id)) next.removed.push(op.id);
        delete next.updated[op.id];
      }
    } else if (op.op === "update") {
      if (!op.id) continue;
      const patch = fieldPatch(op);
      const addedItem = next.added.find((a) => a.id === op.id);
      if (addedItem) {
        Object.assign(addedItem, { ...patch, time: { ...addedItem.time, ...(patch.time ?? {}) } });
      } else {
        const prev = next.updated[op.id] ?? {};
        next.updated[op.id] = {
          ...prev,
          ...patch,
          time: { ...(prev.time ?? {}), ...(patch.time ?? {}) },
        };
        if (next.updated[op.id].time && Object.keys(next.updated[op.id].time!).length === 0) {
          delete next.updated[op.id].time;
        }
      }
    } else if (op.op === "add") {
      next.added.push(buildNewItem(op, base));
    }
  }
  next.rev += 1;
  next.updatedAt = nowIso;
  return next;
}

function msToSeoulHHMM(ms: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}
function msToSeoulDate(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/**
 * pivot 以降（pivot より後に開始する予定）を deltaMs だけ前後にずらす update 操作列を返す。
 * 実績が押したときの「以降を繰り下げ」に使う。日跨ぎは date も更新する。
 */
export function shiftAfterOps(
  itinerary: ItineraryItem[],
  pivot: ItineraryItem,
  deltaMs: number,
): EditOp[] {
  if (!deltaMs) return [];
  const pivotStart = itineraryStartMs(pivot);
  const ops: EditOp[] = [];
  for (const it of itinerary) {
    if (itineraryStartMs(it) <= pivotStart) continue; // pivot より後だけ
    const ns = itineraryStartMs(it) + deltaMs;
    const ne = itineraryEndMs(it) + deltaMs;
    ops.push({
      op: "update",
      id: it.id,
      start: msToSeoulHHMM(ns),
      end: msToSeoulHHMM(ne),
      date: msToSeoulDate(ns),
    });
  }
  return ops;
}

/** 復路（最終便/最終列車）に抵触しそうな予定がないか、軽くクライアント側で検算する。 */
export function checkLastLegConflicts(
  itinerary: ItineraryItem[],
  returnFromTime: string | undefined,
  isLast: boolean | undefined,
): string[] {
  if (!isLast || !returnFromTime) return [];
  const warnings: string[] = [];
  // 最終日（＝最後のアイテムの日付）に限定して HH:MM 比較する簡易チェック。
  const last = itinerary[itinerary.length - 1];
  const lastDate = last?.time.date;
  const toMin = (hhmm: string) => {
    const [h, m] = hhmm.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const dep = toMin(returnFromTime);
  for (const it of itinerary) {
    if (lastDate && it.time.date && it.time.date !== lastDate) continue;
    if (toMin(it.time.end) > dep) {
      warnings.push(
        `「${it.title}」の終了(${it.time.end})が復路出発(${returnFromTime})より後です。最終便/最終列車に間に合わない恐れ。`,
      );
    }
  }
  return warnings;
}
