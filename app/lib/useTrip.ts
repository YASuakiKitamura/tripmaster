"use client";

import { useSyncExternalStore } from "react";
import { DEFAULT_TRIP_ID } from "./trips";

const KEY = "tripmaster-trip";
const listeners = new Set<() => void>();
let current: string | null = null;

function read(): string {
  if (current !== null) return current;
  if (typeof window === "undefined") return DEFAULT_TRIP_ID;
  current = localStorage.getItem(KEY) ?? DEFAULT_TRIP_ID;
  return current;
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      current = e.newValue ?? DEFAULT_TRIP_ID;
      listeners.forEach((l) => l());
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

function setTrip(id: string) {
  current = id;
  if (typeof window !== "undefined") localStorage.setItem(KEY, id);
  listeners.forEach((l) => l()); // 同一タブ内の全インスタンスへ即時通知
}

/** 選択中の旅ID。同一タブ内でも全コンポーネントが即時同期する。 */
export function useTrip(): [string, (id: string) => void] {
  const id = useSyncExternalStore(subscribe, read, () => DEFAULT_TRIP_ID);
  return [id, setTrip];
}
