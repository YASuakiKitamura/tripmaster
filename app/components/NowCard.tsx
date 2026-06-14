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

const pad2 = (n: number) => String(n).padStart(2, "0");

function splitMs(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(s / 86_400),
    hours: Math.floor((s % 86_400) / 3_600),
    mins: Math.floor((s % 3_600) / 60),
    secs: s % 60,
  };
}

/** 行動中・次の予定向けのコンパクトな残り時間（日は残っていれば前置）。 */
function inlineCountdown(ms: number): string {
  const { days, hours, mins, secs } = splitMs(ms);
  const parts: string[] = [];
  if (days) parts.push(`${days}日`);
  if (days || hours) parts.push(`${hours}時間`);
  parts.push(`${mins}分`);
  parts.push(`${secs}秒`);
  return parts.join(" ");
}

/** 出発まで向けの大きなカウントダウン（日／時／分／秒）。秒だけ控えめに。 */
function BigCountdown({ ms }: { ms: number }) {
  const { days, hours, mins, secs } = splitMs(ms);
  const units: { value: string; label: string; secondary?: boolean }[] = [];
  if (days > 0) units.push({ value: String(days), label: "日" });
  units.push({ value: pad2(hours), label: "時間" });
  units.push({ value: pad2(mins), label: "分" });
  units.push({ value: pad2(secs), label: "秒", secondary: true });
  return (
    <div className="flex items-baseline gap-2">
      {units.map((u) => (
        <div key={u.label} className="flex items-baseline gap-0.5">
          <span
            className={`font-bold tabular-nums leading-none ${
              u.secondary ? "text-[20px] opacity-75" : "text-[30px]"
            }`}
          >
            {u.value}
          </span>
          <span className="text-[12px] font-bold opacity-80">{u.label}</span>
        </div>
      ))}
    </div>
  );
}

export function NowCard({
  itinerary,
  perspective = "混合",
}: {
  itinerary: ItineraryItem[];
  perspective?: Perspective;
}) {
  // 毎秒更新でリアルタイム風のカウントダウンにする。
  const now = useNow(1_000);

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
    headline = "出発まで";
    body = (
      <>
        <BigCountdown ms={tripStart - now} />
        <p className="mt-1.5 text-[13px] opacity-90">
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
        <p className="mt-1.5 text-[14px] font-bold tabular-nums">
          終了まで あと {inlineCountdown(itineraryEndMs(current) - now)}
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
        <p className="mt-1.5 text-[14px] font-bold tabular-nums">
          開始まで あと {inlineCountdown(itineraryStartMs(next) - now)}
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
