"use client";

import { useEffect, useState } from "react";

/**
 * 現在時刻(ms)を返し、一定間隔で更新するフック。
 * SSR とのハイドレーション不一致を避けるため、初期値は null。
 */
export function useNow(intervalMs = 30_000): number | null {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return now;
}

/** Asia/Seoul の壁時計を HH:MM で返す */
export function formatSeoulClock(ms: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(ms));
}

export const TRIP_DATE = "2026-06-17";
