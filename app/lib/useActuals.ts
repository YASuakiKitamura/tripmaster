"use client";

import { useCallback, useEffect, useState } from "react";

// 予定の「実績（完了済み）」を端末ローカルに記録する軽量ストア。
// 旅程オーバーレイ（共有）とは別。完了マークは各自の進捗なので端末ローカルで十分。
const key = (tripId: string) => `tripmaster-actuals:${tripId}`;

export function useActuals(tripId: string) {
  const [done, setDone] = useState<Set<string>>(new Set());

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key(tripId));
      setDone(new Set(raw ? (JSON.parse(raw) as string[]) : []));
    } catch {
      setDone(new Set());
    }
  }, [tripId]);

  const toggle = useCallback(
    (id: string) => {
      setDone((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        try {
          localStorage.setItem(key(tripId), JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [tripId],
  );

  return { done, toggle };
}
