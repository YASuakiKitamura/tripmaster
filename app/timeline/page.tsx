"use client";

import { useMemo, useState } from "react";
import {
  itineraryStartMs,
  filterByPerspective,
  PERSPECTIVES,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import type { EditOp } from "../lib/itinerary";
import { checkLastLegConflicts } from "../lib/itinerary";
import { usePerspective } from "../lib/usePerspective";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { useItinerary } from "../lib/useItinerary";
import { useNow, formatSeoulClock, seoulDateString } from "../lib/useNow";
import { TimelineCalendar } from "../components/TimelineCalendar";
import { AiEditPanel } from "../components/AiEditPanel";
import { ItineraryItemForm } from "../components/ItineraryItemForm";
import { NowOverridePanel } from "../components/NowOverridePanel";

export default function TimelinePage() {
  const now = useNow();
  const trip = useResolvedTrip();
  const { itinerary, status, edited, apply, reset } = useItinerary(
    trip.id,
    trip.itinerary,
  );
  const [filter, setFilter] = usePerspective();
  const [aiOpen, setAiOpen] = useState(false);
  const [clockOpen, setClockOpen] = useState(false);
  const [form, setForm] = useState<
    { mode: "add" } | { mode: "edit"; item: ItineraryItem } | null
  >(null);

  const items = filterByPerspective(itinerary, filter);

  const whoOptions = useMemo(() => {
    const s = new Set<string>(trip.itinerary.map((i) => i.who));
    trip.travelers.forEach((t) => s.add(t.name));
    return Array.from(s);
  }, [trip]);

  const defaultDate = useMemo(
    () =>
      trip.itinerary.length
        ? seoulDateString(itineraryStartMs(trip.itinerary[0]))
        : "2026-06-17",
    [trip],
  );

  const warnings = useMemo(
    () =>
      checkLastLegConflicts(
        itinerary,
        trip.legs.return.fromTime,
        trip.legs.return.isLast,
      ),
    [itinerary, trip],
  );

  const submitForm = async (op: EditOp) => {
    await apply([op]);
    setForm(null);
  };

  const deleteItem = (it: ItineraryItem) => {
    if (confirm(`「${it.title}」を削除しますか？`)) apply([{ op: "remove", id: it.id }]);
  };

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
            <span className="text-[22px]">🕐</span>タイムライン
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setClockOpen(true)}
              title="現在時刻を仮設定（デモ用）"
              className="rounded-full border border-[var(--border)] bg-white px-2.5 py-1.5 text-[12px] font-bold text-[var(--text-sub)] active:bg-[var(--bg)]"
            >
              🕐
            </button>
            <button
              onClick={() => setAiOpen(true)}
              className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-3 py-1.5 text-[12px] font-bold text-white active:opacity-90"
            >
              ✏️ AIで変更
            </button>
            <button
              onClick={() => setForm({ mode: "add" })}
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--accent)] active:bg-[var(--bg)]"
            >
              ＋ 追加
            </button>
          </div>
        </div>
        <p className="mt-1 text-[12px] text-[var(--text-sub)]">
          {now !== null && (
            <>
              現在{" "}
              <b className="text-[var(--accent)] tabular-nums">
                {formatSeoulClock(now)}
              </b>{" "}
              ·{" "}
            </>
          )}
          タップで詳細・編集。日中は靖晃・ひとみが別行動。
        </p>

        {/* 編集状態のバッジ */}
        {(edited || status === "saving" || status === "error") && (
          <div className="mt-2 flex items-center justify-between rounded-[10px] border border-[var(--border)] bg-white px-3 py-1.5 text-[11px]">
            <span className="font-bold text-[var(--text-sub)]">
              {status === "saving"
                ? "保存中…"
                : status === "error"
                  ? "⚠️ 同期に失敗（端末には保存済み）"
                  : status === "offline"
                    ? "📵 この端末のみに保存中"
                    : "✏️ 当日の変更を反映中（2台で共有）"}
            </span>
            {edited && (
              <button
                onClick={() => {
                  if (confirm("当日の変更をすべて取り消して元の旅程に戻しますか？")) reset();
                }}
                className="font-bold text-[var(--accent2)]"
              >
                元に戻す
              </button>
            )}
          </div>
        )}

        {/* 最終便/最終列車の警告 */}
        {warnings.length > 0 && (
          <div className="mt-2 rounded-[10px] border-2 border-[var(--accent2)] bg-[var(--accent-light)] px-3 py-2">
            <p className="text-[11px] font-bold text-[var(--accent2)]">⚠️ 要注意</p>
            <ul className="mt-1 space-y-0.5 text-[11px] leading-[1.5] text-[var(--accent-dark)]">
              {warnings.map((w, i) => (
                <li key={i}>• {w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* フィルタ */}
      <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto px-4">
        {PERSPECTIVES.map((w) => (
          <button
            key={w}
            onClick={() => setFilter(w)}
            className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
              filter === w
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white text-[var(--text-sub)]"
            }`}
          >
            {w}
          </button>
        ))}
      </div>

      {/* カレンダー風タイムライン */}
      <div className="mt-2">
        <TimelineCalendar
          items={items}
          tripId={trip.id}
          now={now}
          onEdit={(it) => setForm({ mode: "edit", item: it })}
          onDelete={deleteItem}
        />
      </div>

      <AiEditPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        itinerary={itinerary}
        tripId={trip.id}
        perspective={filter}
        onApply={apply}
      />
      <NowOverridePanel
        open={clockOpen}
        onClose={() => setClockOpen(false)}
        defaultDate={defaultDate}
      />
      {form && (
        <ItineraryItemForm
          item={form.mode === "edit" ? form.item : null}
          whoOptions={whoOptions}
          onSubmit={submitForm}
          onCancel={() => setForm(null)}
        />
      )}
    </div>
  );
}
