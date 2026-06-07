"use client";

import { useMemo, useState } from "react";
import {
  itineraryStartMs,
  itineraryEndMs,
  filterByPerspective,
  PERSPECTIVES,
  WHO_COLORS,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import type { EditOp } from "../lib/itinerary";
import { checkLastLegConflicts } from "../lib/itinerary";
import { usePerspective } from "../lib/usePerspective";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { useItinerary } from "../lib/useItinerary";
import { getPlaceLink, mapUrl } from "../lib/placeLinks";
import { useNow, formatSeoulClock } from "../lib/useNow";
import { AiEditPanel } from "../components/AiEditPanel";
import { ItineraryItemForm } from "../components/ItineraryItemForm";

export default function TimelinePage() {
  const now = useNow();
  const trip = useResolvedTrip();
  const { itinerary, status, edited, apply, reset } = useItinerary(
    trip.id,
    trip.itinerary,
  );
  const [filter, setFilter] = usePerspective();
  const [open, setOpen] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [form, setForm] = useState<{ mode: "add" } | { mode: "edit"; item: ItineraryItem } | null>(
    null,
  );

  const items = filterByPerspective(itinerary, filter);

  const whoOptions = useMemo(() => {
    const s = new Set<string>(trip.itinerary.map((i) => i.who));
    trip.travelers.forEach((t) => s.add(t.name));
    return Array.from(s);
  }, [trip]);

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

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
            <span className="text-[22px]">🕐</span>タイムライン
          </h2>
          <div className="flex items-center gap-1.5">
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

      {/* タイムライン本体 */}
      <ol className="mt-4 px-4">
        {items.map((it) => {
          const start = itineraryStartMs(it);
          const end = itineraryEndMs(it);
          const isNow = now !== null && now >= start && now < end;
          const isPast = now !== null && now >= end;
          const c = WHO_COLORS[it.who] ?? WHO_COLORS["夫婦"];
          const isOpen = open === it.id;
          const isAdded = it.id.startsWith("x-");

          return (
            <li key={it.id} className="relative flex gap-3 pb-2.5">
              {/* 時刻列 + ライン */}
              <div className="flex w-[42px] flex-shrink-0 flex-col items-center">
                <span
                  className={`text-[12px] font-bold tabular-nums ${
                    isNow ? "text-[var(--accent)]" : "text-[var(--text-sub)]"
                  }`}
                >
                  {it.time.start}
                </span>
                <span
                  className={`mt-1 h-2.5 w-2.5 rounded-full ${c.dot} ${
                    isNow ? "ring-4 ring-[var(--accent-light)]" : ""
                  }`}
                />
                <span className="mt-1 w-px flex-1 bg-[var(--border)]" />
              </div>

              {/* カード */}
              <div
                className={`mb-0.5 flex-1 rounded-[12px] border bg-white p-3 shadow-[var(--shadow)] transition-all ${
                  isNow
                    ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                    : "border-[var(--border)]"
                } ${isPast ? "opacity-60" : ""}`}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : it.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[15px] font-bold leading-snug">
                      {it.emoji} {it.title}
                      {isAdded && (
                        <span className="ml-1.5 align-middle text-[10px] font-bold text-[var(--tag-green)]">
                          ＋追加
                        </span>
                      )}
                    </p>
                    <span
                      className={`flex-shrink-0 rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}
                    >
                      {it.who}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] tabular-nums text-[var(--text-sub)]">
                    {it.time.start} – {it.time.end}
                    {isNow && (
                      <span className="ml-2 font-bold text-[var(--accent)]">
                        ● 進行中
                      </span>
                    )}
                  </p>
                </button>

                {isOpen && (
                  <div className="mt-2 border-t border-dashed border-[var(--border)] pt-2">
                    {it.notes && (
                      <p className="text-[12px] leading-[1.6] text-[var(--text-sub)]">
                        {it.notes}
                      </p>
                    )}
                    {(() => {
                      const pl = getPlaceLink(trip.id, it.id);
                      if (!pl) return null;
                      return (
                        <div className="mt-2 flex flex-wrap gap-2">
                          <a
                            href={mapUrl(trip.id, pl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[12px] font-bold text-[var(--accent)] active:opacity-80"
                          >
                            🗺 地図で開く
                          </a>
                          {pl.info && (
                            <a
                              href={pl.info.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="rounded-full border border-[var(--border)] bg-[var(--bg)] px-3 py-1 text-[12px] font-bold text-[var(--accent)] active:opacity-80"
                            >
                              🔗 {pl.info.label}
                            </a>
                          )}
                        </div>
                      );
                    })()}
                    {/* 編集アクション */}
                    <div className="mt-2 flex gap-2 border-t border-dashed border-[var(--border)] pt-2">
                      <button
                        onClick={() => setForm({ mode: "edit", item: it })}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--text-sub)] active:bg-[var(--bg)]"
                      >
                        ✏️ 編集
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`「${it.title}」を削除しますか？`)) apply([{ op: "remove", id: it.id }]);
                        }}
                        className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--accent2)] active:bg-[var(--bg)]"
                      >
                        🗑 削除
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      <AiEditPanel
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        itinerary={itinerary}
        tripId={trip.id}
        perspective={filter}
        onApply={apply}
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
