"use client";

import { useEffect, useRef } from "react";
import type { ItineraryItem } from "../lib/types";
import type { ResolvedTrip } from "../lib/resolveTrip";
import { itineraryStartMs } from "../lib/data";
import { seoulWallToMs, seoulDateString, formatSeoulClock } from "../lib/useNow";

// 復路（最終便/最終列車）までのカウントダウン＋撤退アラート。
// 出発6時間前から表示。空港着の目安時刻を過ぎると赤く警告（撤退アラート）。
const CHECKIN_BUFFER_MIN = 50; // 空港にいるべき目安（出発の何分前）
const HEADSUP_MIN = 45; // 空港へ向かい始める目安（着目安の何分前）
const SHOW_WINDOW_MS = 6 * 3_600_000;

function fmtRemain(ms: number): string {
  const m = Math.max(0, Math.round(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? `${h}時間${m % 60}分` : `${m}分`;
}

export function HomewardCountdown({
  trip,
  itinerary,
  now,
}: {
  trip: ResolvedTrip;
  itinerary: ItineraryItem[];
  now: number | null;
}) {
  const r = trip.legs.return;
  const notified = useRef(false);

  // 復路出発の絶対時刻（最後の予定日 ＋ 復路の出発時刻）
  const lastDate =
    itinerary.length > 0
      ? itinerary
          .map((it) => seoulDateString(itineraryStartMs(it)))
          .sort()
          .at(-1)!
      : "2026-06-17";
  const departMs = seoulWallToMs(lastDate, r.fromTime);
  const atAirportBy = departMs - CHECKIN_BUFFER_MIN * 60000;

  const level =
    now === null
      ? "hidden"
      : now >= departMs
        ? "gone"
        : now >= atAirportBy
          ? "red"
          : now >= atAirportBy - HEADSUP_MIN * 60000
            ? "amber"
            : now >= departMs - SHOW_WINDOW_MS
              ? "green"
              : "hidden";

  // 撤退ライン到達時にブラウザ通知（タブが開いている間のみ・任意）
  useEffect(() => {
    if (level === "amber" && typeof Notification !== "undefined") {
      if (Notification.permission === "default") Notification.requestPermission();
    }
    if (level === "red" && !notified.current && typeof Notification !== "undefined") {
      notified.current = true;
      if (Notification.permission === "granted") {
        new Notification("🚨 そろそろ空港へ", {
          body: `${r.name} ${r.fromTime} 発。空港着の目安 ${formatSeoulClock(atAirportBy)} を過ぎました。`,
        });
      }
    }
  }, [level, r.name, r.fromTime, atAirportBy]);

  if (level === "hidden" || now === null) return null;

  const palette =
    level === "red"
      ? "border-[var(--accent2)] bg-[var(--accent2)] text-white"
      : level === "amber"
        ? "border-[var(--accent2)] bg-[var(--accent-light)] text-[var(--accent-dark)]"
        : level === "gone"
          ? "border-[var(--border)] bg-white text-[var(--text-sub)]"
          : "border-[var(--border)] bg-white text-[var(--text)]";

  const headline =
    level === "red"
      ? "🚨 撤退！空港へ向かってください"
      : level === "amber"
        ? "⏰ そろそろ空港へ向かう時間"
        : level === "gone"
          ? "✈️ 出発時刻を過ぎました"
          : r.isLast
            ? "🛫 最終便まで"
            : "🛫 復路まで";

  return (
    <div className={`mt-3 rounded-[14px] border-2 p-4 shadow-[var(--shadow)] ${palette}`}>
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[13px] font-bold">{headline}</p>
        <p className="text-[12px] font-bold tabular-nums opacity-90">
          {r.emoji} {r.name} {r.fromTime}発
          {r.isLast && level !== "gone" ? "（最終）" : ""}
        </p>
      </div>
      {level !== "gone" && (
        <p className="mt-1 text-[26px] font-bold tabular-nums">
          あと {fmtRemain(departMs - now)}
        </p>
      )}
      <p className={`mt-1 text-[12px] ${level === "red" ? "opacity-90" : "text-[var(--text-sub)]"}`}>
        {level === "red"
          ? `空港着の目安 ${formatSeoulClock(atAirportBy)} を過ぎています。`
          : level === "gone"
            ? "次の手段は緊急ページを確認。"
            : `空港着の目安 ${formatSeoulClock(atAirportBy)}（${r.fromLabel}${r.fromTime}発）`}
      </p>
    </div>
  );
}
