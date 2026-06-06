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
import { useNow } from "../lib/useNow";

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

  const { target, prev, following } = useMemo(() => {
    const items = filterByPerspective(itinerary, perspective);
    if (now === null) return { target: null, prev: null, following: null };
    const current = items.find(
      (it) => now >= itineraryStartMs(it) && now < itineraryEndMs(it),
    );
    const nextIdx = items.findIndex((it) => itineraryStartMs(it) > now);
    let target: ItineraryItem | null = null;
    let prev: ItineraryItem | null = current ?? null;
    let following: ItineraryItem | null = null;
    if (nextIdx !== -1) {
      target = items[nextIdx];
      if (!prev && nextIdx > 0) prev = items[nextIdx - 1];
      following = items[nextIdx + 1] ?? null;
    }
    return { target, prev, following };
  }, [now, perspective, itinerary]);

  const cacheKey = target ? `${tripId}:${perspective}:${target.id}` : null;

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
        prev: prev ? { title: prev.title, time: prev.time.start } : null,
        next: {
          title: target.title,
          time: target.time.start,
          who: target.who,
          notes: target.notes,
        },
        following: following
          ? { title: following.title, time: following.time.start }
          : null,
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

  const c = WHO_COLORS[target.who];

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

      <p className="mt-1.5 text-[16px] font-bold leading-snug">
        {target.emoji} {target.title}
      </p>
      <p className="text-[11px] tabular-nums text-[var(--text-sub)]">
        {target.time.start} 開始
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
