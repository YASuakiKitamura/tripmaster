"use client";

import { useState } from "react";
import {
  itineraryStartMs,
  itineraryEndMs,
  filterByPerspective,
  PERSPECTIVES,
  WHO_COLORS,
} from "../lib/data";
import { usePerspective } from "../lib/usePerspective";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { getPlaceLink, mapUrl } from "../lib/placeLinks";
import { useNow, formatSeoulClock } from "../lib/useNow";

export default function TimelinePage() {
  const now = useNow();
  const trip = useResolvedTrip();
  const [filter, setFilter] = usePerspective();
  const [open, setOpen] = useState<string | null>(null);

  const items = filterByPerspective(trip.itinerary, filter);

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
          <span className="text-[22px]">🕐</span>タイムライン
        </h2>
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
          タップで詳細。日中は靖晃・ひとみが別行動。
        </p>
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
          const c = WHO_COLORS[it.who];
          const isOpen = open === it.id;

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
                    <p className="text-[12px] leading-[1.6] text-[var(--text-sub)]">
                      {it.notes}
                    </p>
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
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
