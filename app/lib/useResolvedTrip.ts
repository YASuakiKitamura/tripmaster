"use client";

import { useTrip } from "./useTrip";
import { resolveTrip, type ResolvedTrip } from "./resolveTrip";

/** 選択中の旅を正規化済みデータとして返す（クライアント用） */
export function useResolvedTrip(): ResolvedTrip {
  const [id] = useTrip();
  return resolveTrip(id);
}
