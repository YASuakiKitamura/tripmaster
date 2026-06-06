"use client";

import { useState } from "react";
import {
  itineraryEndMs,
  filterByPerspective,
  type Perspective,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import { useNow, formatSeoulClock } from "../lib/useNow";

export function ReplanButton({
  itinerary,
  tripId,
  perspective = "混合",
}: {
  itinerary: ItineraryItem[];
  tripId: string;
  perspective?: Perspective;
}) {
  const now = useNow();
  const [open, setOpen] = useState(false);
  const [change, setChange] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const submit = async () => {
    if (!change.trim() || loading) return;
    setLoading(true);
    setError(false);
    setResult("");

    const base = now ?? Date.now();
    const remaining = filterByPerspective(itinerary, perspective)
      .filter((it) => itineraryEndMs(it) >= base)
      .map((it) => ({ time: it.time.start, who: it.who, title: it.title }));

    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "replan",
          tripId,
          change,
          perspective,
          currentTime: now !== null ? formatSeoulClock(now) : undefined,
          remaining,
        }),
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setResult((data.text as string) || "");
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1 rounded-full border border-[var(--border)] bg-white px-2.5 py-1 text-[11px] font-bold text-[var(--text-sub)] active:bg-[var(--bg)]"
      >
        🔁 予定変更・相談
      </button>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center">
          <div className="max-h-[88dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[18px] bg-[var(--bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-hover)] sm:rounded-[18px]">
            <div className="flex items-center justify-between">
              <h3 className="font-serif-jp text-[16px] font-bold text-[var(--accent-dark)]">
                🔁 予定を組み直す
              </h3>
              <button
                onClick={() => setOpen(false)}
                className="text-[13px] font-bold text-[var(--text-sub)]"
              >
                閉じる
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[var(--text-sub)]">
              起きたこと・変えたいことを書くと、Claudeが残りの行程を組み直します（最終便を死守）。
            </p>

            <textarea
              value={change}
              onChange={(e) => setChange(e.target.value)}
              rows={3}
              placeholder="例: 電車が遅延。昼食を30分延ばしたい。観光地が激混みで1時間待ち…"
              className="mt-3 w-full resize-none rounded-[10px] border border-[var(--border)] bg-white p-3 text-[14px] outline-none focus:border-[var(--accent)]"
            />

            <button
              onClick={submit}
              disabled={loading || !change.trim()}
              className="mt-2 w-full rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
            >
              {loading ? "Claudeが組み直し中…" : "Claudeに相談する"}
            </button>

            {error && (
              <p className="mt-3 text-[13px] text-[var(--accent-dark)]">
                うまく取得できませんでした。もう一度お試しください。
              </p>
            )}
            {result && (
              <div className="mt-3 rounded-[12px] border border-[var(--border)] bg-white p-3">
                <p className="mb-1 text-[11px] font-bold text-[var(--text-sub)]">
                  ✨ Claudeの提案
                </p>
                <p className="whitespace-pre-wrap text-[13px] leading-[1.7] text-[var(--text)]">
                  {result}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
