"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  itineraryStartMs,
  itineraryEndMs,
  filterByPerspective,
  WHO_COLORS,
  type Perspective,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import { useNow, formatSeoulClock } from "../lib/useNow";

export function NextTodoCard({
  itinerary,
  tripId,
  perspective = "混合",
}: {
  itinerary: ItineraryItem[];
  tripId: string;
  perspective?: Perspective;
}) {
  const now = useNow();
  const [text, setText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const cache = useRef<Map<string, string>>(new Map());

  const { target, current, prev, following, minsToNext } = useMemo(() => {
    const items = filterByPerspective(itinerary, perspective);
    const empty = {
      target: null,
      current: null as ItineraryItem | null,
      prev: null as ItineraryItem | null,
      following: [] as ItineraryItem[],
      minsToNext: null as number | null,
    };
    if (now === null) return empty;
    const current =
      items.find(
        (it) => now >= itineraryStartMs(it) && now < itineraryEndMs(it),
      ) ?? null;
    const nextIdx = items.findIndex((it) => itineraryStartMs(it) > now);
    if (nextIdx === -1) return { ...empty, current };
    const target = items[nextIdx];
    // 直前に完了した予定（進行中があればそちらを優先表示するので null）
    const prev = current ? null : nextIdx > 0 ? items[nextIdx - 1] : null;
    return {
      target,
      current,
      prev,
      following: items.slice(nextIdx + 1, nextIdx + 3),
      minsToNext: Math.round((itineraryStartMs(target) - now) / 60000),
    };
  }, [now, perspective, itinerary]);

  // ステータス・バケツ: 状況が変わったら再生成、同じ局面なら使い回す（API節約）
  const urgency =
    minsToNext === null
      ? "none"
      : minsToNext <= 0
        ? "overdue"
        : minsToNext <= 10
          ? "now"
          : minsToNext <= 30
            ? "soon"
            : "later";
  const phase = current ? `in:${current.id}` : "gap";
  const cacheKey = target
    ? `${tripId}:${perspective}:${target.id}:${phase}:${urgency}`
    : null;

  useEffect(() => {
    if (!target || !cacheKey) {
      setText("");
      return;
    }
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setText(cached);
      setError(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    fetch("/api/assistant", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        mode: "next-todo",
        tripId,
        perspective,
        currentTime: now !== null ? formatSeoulClock(now) : null,
        minsToNext,
        current: current
          ? { title: current.title, end: current.time.end, who: current.who }
          : null,
        prev: prev ? { title: prev.title, time: prev.time.start } : null,
        next: {
          title: target.title,
          time: target.time.start,
          who: target.who,
          notes: target.notes,
        },
        following: following.map((f) => ({
          title: f.title,
          time: f.time.start,
        })),
      }),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((data) => {
        if (cancelled) return;
        const t = (data.text as string) || "";
        cache.current.set(cacheKey, t);
        setText(t);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  if (now === null || !target) return null;

  const c = WHO_COLORS[target.who] ?? WHO_COLORS["夫婦"];

  return (
    <div className="mt-3 rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold text-[var(--text-sub)]">
          ✨ 次にやること（AIガイド）
        </p>
        <span
          className={`rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}
        >
          {target.who}
        </span>
      </div>

      {current && (
        <p className="mt-1 text-[11px] font-bold text-[var(--accent)]">
          ▶ いま：{current.emoji} {current.title}（〜{current.time.end}）
        </p>
      )}

      <p className="mt-1.5 text-[16px] font-bold leading-snug">
        {target.emoji} {target.title}
      </p>
      <p className="text-[11px] tabular-nums text-[var(--text-sub)]">
        {target.time.start} 開始
        {minsToNext !== null &&
          (minsToNext <= 0
            ? `・開始予定から${-minsToNext}分経過`
            : `・あと約${minsToNext}分`)}
      </p>

      <div className="mt-2 border-t border-dashed border-[var(--border)] pt-2">
        {loading && (
          <p className="flex items-center gap-1.5 text-[13px] text-[var(--text-sub)]">
            <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
            Claudeが案内を準備中…
          </p>
        )}
        {!loading && text && (
          <p className="text-[13px] leading-[1.65] text-[var(--text)]">{text}</p>
        )}
        {!loading && error && (
          <p className="text-[12px] text-[var(--text-sub)]">
            案内を取得できませんでした。備考: {target.notes}
          </p>
        )}
      </div>
    </div>
  );
}
