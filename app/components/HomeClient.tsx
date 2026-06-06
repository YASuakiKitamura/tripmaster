"use client";

import Link from "next/link";
import { PERSPECTIVES } from "../lib/data";
import { usePerspective } from "../lib/usePerspective";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import type { Leg } from "../lib/resolveTrip";
import { NowCard } from "./NowCard";
import { NextTodoCard } from "./NextTodoCard";
import { ReplanButton } from "./ReplanButton";
import { WeatherCard } from "./WeatherCard";
import { Tag } from "./ui";

function LegRow({ leg }: { leg: Leg }) {
  return (
    <div className="flex items-center justify-between border-b border-[var(--border)] py-2 last:border-0">
      <div>
        <span className="text-[11px] font-bold text-[var(--text-sub)]">
          {leg.kind}
        </span>
        <span className="ml-2 font-bold">
          {leg.emoji} {leg.name}
        </span>
        {leg.isLast && (
          <span className="ml-2">
            <Tag color="orange">最終</Tag>
          </span>
        )}
      </div>
      <div className="text-right text-[13px] tabular-nums">
        <span className="font-bold">{leg.fromLabel}</span> {leg.fromTime}
        <span className="mx-1 text-[var(--text-sub)]">→</span>
        <span className="font-bold">{leg.toLabel}</span> {leg.toTime}
        {leg.nextDay && <sup className="text-[var(--accent)]">+1</sup>}
      </div>
    </div>
  );
}

export function HomeClient() {
  const [perspective, setPerspective] = usePerspective();
  const trip = useResolvedTrip();
  const cards = trip.nav.filter((n) => n.href !== "/");
  const seatInfo = trip.legs.outbound.seatInfo;

  return (
    <div className="px-4 pb-8 pt-4">
      {/* 上部コントロール */}
      <div className="mb-3 flex items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[12px] font-bold text-[var(--text-sub)]">
          <span>👀 視点</span>
          <select
            value={perspective}
            onChange={(e) =>
              setPerspective(e.target.value as typeof perspective)
            }
            className="rounded-[8px] border border-[var(--border)] bg-white px-2.5 py-1.5 text-[13px] font-bold text-[var(--text)] outline-none focus:border-[var(--accent)]"
          >
            {PERSPECTIVES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <ReplanButton
          itinerary={trip.itinerary}
          tripId={trip.id}
          perspective={perspective}
        />
      </div>

      <NowCard itinerary={trip.itinerary} perspective={perspective} />
      <NextTodoCard
        itinerary={trip.itinerary}
        tripId={trip.id}
        perspective={perspective}
      />

      {/* 当日の天気 */}
      {trip.weather.length > 0 && <WeatherCard points={trip.weather} />}

      {/* 交通サマリー */}
      <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
        <div className="mb-1 flex items-center justify-between">
          <h2 className="font-serif-jp text-[15px] font-bold text-[var(--accent-dark)]">
            🚉 移動
          </h2>
          {seatInfo && (
            <span className="text-[11px] text-[var(--text-sub)]">{seatInfo}</span>
          )}
        </div>
        <LegRow leg={trip.legs.outbound} />
        <LegRow leg={trip.legs.return} />
      </div>

      {/* 宿（あれば） */}
      {trip.lodging && (
        <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
          <h2 className="font-serif-jp text-[15px] font-bold text-[var(--accent-dark)]">
            🏨 宿
          </h2>
          <p className="mt-1 text-[14px] font-bold">{trip.lodging.name}</p>
          <p className="mt-0.5 text-[12px] text-[var(--text-sub)]">
            {trip.lodging.area}
          </p>
          <p className="mt-1 text-[12px] tabular-nums text-[var(--text-sub)]">
            IN {trip.lodging.checkIn} / OUT {trip.lodging.checkOut}
          </p>
          {trip.lodging.notes && (
            <p className="mt-1 text-[11px] leading-[1.5] text-[var(--text-sub)]">
              {trip.lodging.notes}
            </p>
          )}
        </div>
      )}

      {/* ナビゲーションカード */}
      <div className="mt-5 grid grid-cols-2 gap-3">
        {cards.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex flex-col rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)] transition-all active:scale-[0.98] active:shadow-[var(--shadow-hover)]"
          >
            <span className="text-[30px] leading-none">{item.emoji}</span>
            <span className="mt-2 font-serif-jp text-[16px] font-bold text-[var(--text)]">
              {item.label}
            </span>
            <span className="mt-0.5 text-[11px] text-[var(--text-sub)]">
              {item.desc}
            </span>
          </Link>
        ))}
      </div>

      {/* 便利アプリ直リンク */}
      {trip.apps.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-bold text-[var(--text-sub)]">
            🧰 便利アプリ
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {trip.apps.map((a) => (
              <a
                key={a.label}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                title={a.note}
                className="flex flex-col items-center gap-1 rounded-[12px] border border-[var(--border)] bg-white px-2 py-3 text-center shadow-[var(--shadow)] active:scale-[0.97] active:shadow-[var(--shadow-hover)]"
              >
                <span className="text-[24px] leading-none">{a.emoji}</span>
                <span className="text-[11px] font-bold leading-tight text-[var(--text)]">
                  {a.label}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 重要リマインド */}
      <div className="mt-5 rounded-[12px] border-2 border-[var(--accent2)] bg-[var(--accent-light)] p-4">
        <h3 className="text-[13px] font-bold text-[var(--accent2)]">
          ⚠️ 最重要リマインド
        </h3>
        <ul className="mt-2 space-y-1.5 text-[12px] leading-[1.5] text-[var(--accent-dark)]">
          {trip.reminders.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      </div>

      {/* 出発前に要確認（あれば） */}
      {trip.confirmList.length > 0 && (
        <div className="mt-5 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
          <h3 className="text-[13px] font-bold text-[var(--accent2)]">
            ✅ 出発前に要確認（{trip.confirmList.length}件）
          </h3>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-[1.5] text-[var(--text-sub)]">
            {trip.confirmList.map((c, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="text-[var(--accent2)]">□</span>
                <span>{c}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 豆知識（あれば） */}
      {trip.tips && trip.tips.length > 0 && (
        <div className="mt-5">
          <h3 className="mb-2 text-[13px] font-bold text-[var(--text-sub)]">
            💡 豆知識・コツ
          </h3>
          <div className="space-y-2">
            {trip.tips.map((t, i) => (
              <div
                key={i}
                className="rounded-[12px] border border-[var(--border)] bg-white p-3 shadow-[var(--shadow)]"
              >
                <p className="text-[13px] font-bold">{t.title}</p>
                <p className="mt-0.5 text-[12px] leading-[1.6] text-[var(--text-sub)]">
                  {t.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
