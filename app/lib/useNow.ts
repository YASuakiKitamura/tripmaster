"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

// --- TIMENOW 上書き（デモ・動作確認用の仮の現在時刻） ---
// 実時刻との差分(offset ms)を localStorage に保存し、now = Date.now() + offset とする。
// offset 方式なので、仮設定しても時間は進み続ける（現在時刻ラインも動く）。
const OVERRIDE_KEY = "tripmaster-now-offset";
const listeners = new Set<() => void>();
let offset = 0;
let loaded = false;

function ensureLoaded() {
  if (loaded || typeof window === "undefined") return;
  const raw = localStorage.getItem(OVERRIDE_KEY);
  offset = raw ? Number(raw) || 0 : 0;
  loaded = true;
}

function subscribeOffset(cb: () => void): () => void {
  ensureLoaded();
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === OVERRIDE_KEY) {
      offset = e.newValue ? Number(e.newValue) || 0 : 0;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

/** 仮の現在時刻(ms)に設定。null でライブに戻す。 */
export function setNowOverride(targetMs: number | null) {
  offset = targetMs === null ? 0 : targetMs - Date.now();
  loaded = true;
  if (typeof window !== "undefined") {
    if (offset === 0) localStorage.removeItem(OVERRIDE_KEY);
    else localStorage.setItem(OVERRIDE_KEY, String(offset));
  }
  listeners.forEach((l) => l());
}

/** 現在のオフセット(ms)。0 ならライブ。 */
export function useNowOffset(): number {
  return useSyncExternalStore(
    subscribeOffset,
    () => {
      ensureLoaded();
      return offset;
    },
    () => 0,
  );
}

/**
 * 現在時刻(ms)を返し、一定間隔で更新するフック。
 * TIMENOW 上書きが設定されていればその分ずらした時刻を返す。
 * SSR とのハイドレーション不一致を避けるため、初期値は null。
 */
export function useNow(intervalMs = 30_000): number | null {
  const off = useNowOffset();
  const [tick, setTick] = useState<number | null>(null);

  useEffect(() => {
    setTick(Date.now());
    const id = setInterval(() => setTick(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return tick === null ? null : tick + off;
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

/** Asia/Seoul の壁時計の「日付 YYYY-MM-DD」を返す */
export function seoulDateString(ms: number): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(ms));
}

/** Asia/Seoul の「M/D(曜)」ラベル */
export function seoulDateLabel(ms: number): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Seoul",
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(ms));
}

/** "YYYY-MM-DD" と "HH:MM"（Asia/Seoul 壁時計）を ms に変換。KST=UTC+9。 */
export function seoulWallToMs(date: string, time: string): number {
  const [y, mo, d] = date.split("-").map(Number);
  const [h, m] = time.split(":").map(Number);
  return Date.UTC(y, mo - 1, d, h - 9, m);
}

export const TRIP_DATE = "2026-06-17";
