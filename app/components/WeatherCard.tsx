"use client";

import { useEffect, useState } from "react";
import type { WeatherPoint } from "../lib/resolveTrip";

interface DayWeather {
  label: string;
  date: string;
  ok: boolean;
  emoji: string;
  desc: string;
  tmax?: number;
  tmin?: number;
  pop?: number;
  daysUntil: number;
}

// WMO weather code → 絵文字・日本語
function wmo(code: number): { emoji: string; desc: string } {
  if (code === 0) return { emoji: "☀️", desc: "快晴" };
  if (code <= 2) return { emoji: "🌤", desc: "晴れ時々曇り" };
  if (code === 3) return { emoji: "☁️", desc: "曇り" };
  if (code <= 48) return { emoji: "🌫", desc: "霧" };
  if (code <= 57) return { emoji: "🌦", desc: "霧雨" };
  if (code <= 67) return { emoji: "🌧", desc: "雨" };
  if (code <= 77) return { emoji: "🌨", desc: "雪" };
  if (code <= 82) return { emoji: "🌦", desc: "にわか雨" };
  if (code <= 86) return { emoji: "🌨", desc: "にわか雪" };
  return { emoji: "⛈", desc: "雷雨" };
}

function daysUntil(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((target - today) / 86_400_000);
}

export function WeatherCard({ points }: { points: WeatherPoint[] }) {
  const [days, setDays] = useState<DayWeather[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      points.map(async (p): Promise<DayWeather> => {
        const du = daysUntil(p.date);
        const base: DayWeather = {
          label: p.label,
          date: p.date,
          ok: false,
          emoji: "📅",
          desc: "",
          daysUntil: du,
        };
        try {
          const url = `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&start_date=${p.date}&end_date=${p.date}`;
          const r = await fetch(url);
          const j = await r.json();
          const dd = j?.daily;
          if (dd && Array.isArray(dd.time) && dd.temperature_2m_max?.[0] != null) {
            const w = wmo(dd.weather_code?.[0] ?? 3);
            return {
              ...base,
              ok: true,
              emoji: w.emoji,
              desc: w.desc,
              tmax: Math.round(dd.temperature_2m_max[0]),
              tmin: Math.round(dd.temperature_2m_min[0]),
              pop: dd.precipitation_probability_max?.[0] ?? undefined,
            };
          }
        } catch {
          /* ignore → 予報範囲外として扱う */
        }
        return base;
      }),
    ).then((res) => {
      if (!cancelled) setDays(res);
    });
    return () => {
      cancelled = true;
    };
  }, [points]);

  return (
    <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
      <h2 className="font-serif-jp text-[15px] font-bold text-[var(--accent-dark)]">
        🌤 当日の天気
      </h2>
      <div className="mt-2 space-y-2">
        {(days ?? points.map((p) => ({
          label: p.label,
          date: p.date,
          ok: false,
          emoji: "⏳",
          desc: "",
          daysUntil: daysUntil(p.date),
        }))).map((d) => (
          <div
            key={d.label + d.date}
            className="flex items-center justify-between gap-3 rounded-[10px] bg-[var(--bg)] px-3 py-2"
          >
            <div className="min-w-0">
              <p className="text-[13px] font-bold">{d.label}</p>
              <p className="text-[10px] tabular-nums text-[var(--text-sub)]">
                {d.date.replaceAll("-", ".")}
              </p>
            </div>
            {d.ok ? (
              <div className="flex items-center gap-3">
                <span className="text-[13px] text-[var(--text-sub)]">
                  {d.emoji} {d.desc}
                </span>
                <span className="text-[15px] font-bold tabular-nums">
                  <span className="text-[var(--accent2)]">{d.tmax}°</span>
                  <span className="mx-0.5 text-[var(--text-sub)]">/</span>
                  <span className="text-[var(--accent)]">{d.tmin}°</span>
                </span>
                {d.pop != null && (
                  <span className="text-[11px] font-bold tabular-nums text-[var(--accent)]">
                    ☔{d.pop}%
                  </span>
                )}
              </div>
            ) : (
              <span className="text-[11px] text-[var(--text-sub)]">
                {days === null
                  ? "取得中…"
                  : d.daysUntil > 0
                    ? `あと${d.daysUntil}日・近づくと予報表示`
                    : "予報の取得待ち"}
              </span>
            )}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-sub)]">
        提供: Open-Meteo（約16日先まで予報）
      </p>
    </div>
  );
}
