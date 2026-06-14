"use client";

import { useEffect, useState } from "react";
import type { WeatherPoint } from "../lib/resolveTrip";

interface HourPoint {
  hour: string; // "HH"
  emoji: string;
  temp: number;
  pop?: number;
  isNow?: boolean;
}

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
  hours?: HourPoint[];
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

const dayKey = (d: { label: string; date: string }) => `${d.label}|${d.date}`;

export function WeatherCard({ points }: { points: WeatherPoint[] }) {
  const [days, setDays] = useState<DayWeather[] | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());

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
          const url =
            `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}` +
            `&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max` +
            `&hourly=weather_code,temperature_2m,precipitation_probability` +
            `&timezone=auto&start_date=${p.date}&end_date=${p.date}`;
          const r = await fetch(url);
          const j = await r.json();
          const dd = j?.daily;
          if (!(dd && Array.isArray(dd.time) && dd.temperature_2m_max?.[0] != null)) {
            return base;
          }

          // 当地の現在時刻（"YYYY-MM-DDTHH"）を作り、一致するコマを「いま」にする。
          const offset =
            typeof j.utc_offset_seconds === "number" ? j.utc_offset_seconds : 0;
          const nowKey = new Date(Date.now() + offset * 1000)
            .toISOString()
            .slice(0, 13);
          const hh = j?.hourly;
          let hours: HourPoint[] | undefined;
          if (hh && Array.isArray(hh.time) && hh.time.length) {
            hours = hh.time.map((t: string, i: number): HourPoint => {
              const w = wmo(hh.weather_code?.[i] ?? 3);
              const pop = hh.precipitation_probability?.[i];
              return {
                hour: t.slice(11, 13),
                emoji: w.emoji,
                temp: Math.round(hh.temperature_2m?.[i] ?? 0),
                pop: pop ?? undefined,
                isNow: t.slice(0, 13) === nowKey,
              };
            });
          }

          const w = wmo(dd.weather_code?.[0] ?? 3);
          return {
            ...base,
            ok: true,
            emoji: w.emoji,
            desc: w.desc,
            tmax: Math.round(dd.temperature_2m_max[0]),
            tmin: Math.round(dd.temperature_2m_min[0]),
            pop: dd.precipitation_probability_max?.[0] ?? undefined,
            hours,
          };
        } catch {
          /* ignore → 予報範囲外として扱う */
        }
        return base;
      }),
    ).then((res) => {
      if (cancelled) return;
      setDays(res);
      // 直近で時間別が取れた日を初期展開しておく。
      const first = res.find((d) => d.hours && d.hours.length);
      if (first) setOpen(new Set([dayKey(first)]));
    });
    return () => {
      cancelled = true;
    };
  }, [points]);

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rows: DayWeather[] =
    days ??
    points.map((p) => ({
      label: p.label,
      date: p.date,
      ok: false,
      emoji: "⏳",
      desc: "",
      daysUntil: daysUntil(p.date),
    }));

  return (
    <div className="mt-4 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
      <h2 className="font-serif-jp text-[15px] font-bold text-[var(--accent-dark)]">
        🌤 当日の天気
      </h2>
      <div className="mt-2 space-y-2">
        {rows.map((d) => {
          const key = dayKey(d);
          const hasHours = !!(d.hours && d.hours.length);
          const expanded = open.has(key);
          return (
            <div key={key} className="rounded-[10px] bg-[var(--bg)]">
              <button
                type="button"
                onClick={hasHours ? () => toggle(key) : undefined}
                aria-expanded={hasHours ? expanded : undefined}
                className={`flex w-full items-center justify-between gap-3 px-3 py-2 text-left ${
                  hasHours ? "active:opacity-80" : "cursor-default"
                }`}
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
                    {hasHours && (
                      <span className="text-[10px] text-[var(--text-sub)]">
                        {expanded ? "▴" : "時間別 ▾"}
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
              </button>

              {hasHours && expanded && (
                <div className="overflow-x-auto px-2 pb-2">
                  <div className="flex gap-1.5">
                    {d.hours!.map((h) => (
                      <div
                        key={h.hour}
                        className={`flex min-w-[46px] flex-col items-center gap-0.5 rounded-[8px] px-1.5 py-1.5 ${
                          h.isNow
                            ? "bg-[var(--accent-light)] ring-1 ring-[var(--accent)]"
                            : "bg-white"
                        }`}
                      >
                        <span className="text-[10px] tabular-nums text-[var(--text-sub)]">
                          {h.isNow ? "今" : `${h.hour}時`}
                        </span>
                        <span className="text-[16px] leading-none">{h.emoji}</span>
                        <span className="text-[12px] font-bold tabular-nums">
                          {h.temp}°
                        </span>
                        <span
                          className={`text-[9px] tabular-nums ${
                            h.pop != null && h.pop >= 30
                              ? "font-bold text-[var(--accent)]"
                              : "text-[var(--text-sub)]"
                          }`}
                        >
                          ☔{h.pop ?? 0}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-[10px] text-[var(--text-sub)]">
        提供: Open-Meteo（約16日先まで・行をタップで1時間ごと）
      </p>
    </div>
  );
}
