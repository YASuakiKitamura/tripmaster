"use client";

import Link from "next/link";
import {
  itineraryStartMs,
  itineraryEndMs,
  filterByPerspective,
  type Perspective,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import { useNow, formatSeoulClock, TRIP_DATE } from "../lib/useNow";

export function NowCard({
  itinerary,
  perspective = "混合",
}: {
  itinerary: ItineraryItem[];
  perspective?: Perspective;
}) {
  const now = useNow();

  if (now === null) {
    return (
      <div className="rounded-[14px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-4 text-white shadow-[var(--shadow-hover)]">
        <p className="text-[12px] font-bold opacity-85">現在時刻</p>
        <p className="mt-1 text-[28px] font-bold tabular-nums">--:--</p>
      </div>
    );
  }

  const items = filterByPerspective(itinerary, perspective);
  if (items.length === 0) {
    return (
      <div className="rounded-[14px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-4 text-white shadow-[var(--shadow-hover)]">
        <p className="text-[12px] font-bold opacity-85">この視点の予定はありません</p>
      </div>
    );
  }
  const tripStart = itineraryStartMs(items[0]);
  const tripEnd = itineraryEndMs(items[items.length - 1]);

  const seoulDate = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(now));

  const clock = formatSeoulClock(now);

  const current = items.find(
    (it) => now >= itineraryStartMs(it) && now < itineraryEndMs(it),
  );
  const next = items.find((it) => itineraryStartMs(it) > now);

  let headline: string;
  let body: React.ReactNode;

  if (now < tripStart) {
    const days = Math.ceil((tripStart - now) / 86_400_000);
    headline = "出発まで";
    body = (
      <>
        <p className="text-[28px] font-bold">あと {days} 日</p>
        <p className="mt-1 text-[13px] opacity-90">
          {seoulDate === TRIP_DATE
            ? "いよいよ当日！"
            : "出発前の準備を確認しておきましょう。"}
        </p>
      </>
    );
  } else if (now > tripEnd) {
    headline = "旅程終了";
    body = <p className="text-[18px] font-bold">おつかれさまでした 🎉</p>;
  } else if (current) {
    headline = "🔴 いま行動中";
    body = (
      <>
        <p className="text-[19px] font-bold leading-snug">
          {current.emoji} {current.title}
        </p>
        <p className="mt-1 text-[13px] opacity-90">
          {current.time.start}–{current.time.end}（{current.who}）
        </p>
      </>
    );
  } else {
    headline = "次の予定";
    body = next ? (
      <>
        <p className="text-[19px] font-bold leading-snug">
          {next.emoji} {next.title}
        </p>
        <p className="mt-1 text-[13px] opacity-90">
          {next.time.start} から（{next.who}）
        </p>
      </>
    ) : (
      <p className="text-[16px] font-bold">予定はすべて完了</p>
    );
  }

  return (
    <Link href="/timeline" className="block">
      <div className="rounded-[14px] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-4 text-white shadow-[var(--shadow-hover)] active:scale-[0.99] transition-transform">
        <div className="flex items-baseline justify-between">
          <p className="text-[12px] font-bold opacity-85">{headline}</p>
          <p className="text-[13px] font-bold tabular-nums opacity-90">
            🕐 {clock}
          </p>
        </div>
        <div className="mt-1.5">{body}</div>
        <p className="mt-2 text-[11px] font-bold opacity-75">
          タップして行程表へ →
        </p>
      </div>
    </Link>
  );
}
