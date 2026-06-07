"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ItineraryItem } from "./types";
import {
  applyOps,
  applyOverlay,
  emptyOverlay,
  isEmptyOverlay,
  type EditOp,
  type ItineraryOverlay,
} from "./itinerary";

type SyncStatus = "idle" | "loading" | "saving" | "error" | "offline";

const lsKey = (tripId: string) => `tripmaster-itinerary:${tripId}`;

function readLocal(tripId: string): ItineraryOverlay | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(lsKey(tripId));
    return raw ? (JSON.parse(raw) as ItineraryOverlay) : null;
  } catch {
    return null;
  }
}

function writeLocal(tripId: string, overlay: ItineraryOverlay | null) {
  if (typeof window === "undefined") return;
  try {
    if (overlay && !isEmptyOverlay(overlay)) {
      localStorage.setItem(lsKey(tripId), JSON.stringify(overlay));
    } else {
      localStorage.removeItem(lsKey(tripId));
    }
  } catch {
    /* quota等は無視 */
  }
}

export interface UseItinerary {
  itinerary: ItineraryItem[]; // ベース＋編集を合成・時刻順
  overlay: ItineraryOverlay;
  status: SyncStatus;
  edited: boolean;
  /** 操作列を適用して保存（楽観更新→共有ストアへPUT） */
  apply: (ops: EditOp[]) => Promise<void>;
  /** 全編集を破棄してベースに戻す */
  reset: () => Promise<void>;
  /** 共有ストアから再取得 */
  refresh: () => Promise<void>;
}

/**
 * 旅程の読み書きフック。ベース(static)に共有オーバーレイを重ねて返す。
 * 初回は localStorage で即描画 → 共有ストア(KV)から取得して収束。
 * 編集は楽観更新後に PUT。KV未設定なら localStorage のみで動作。
 */
export function useItinerary(
  tripId: string,
  base: ItineraryItem[],
): UseItinerary {
  const [overlay, setOverlay] = useState<ItineraryOverlay>(emptyOverlay);
  const [status, setStatus] = useState<SyncStatus>("loading");
  const overlayRef = useRef(overlay);
  overlayRef.current = overlay;

  const commit = useCallback(
    (next: ItineraryOverlay) => {
      setOverlay(next);
      writeLocal(tripId, next);
    },
    [tripId],
  );

  const refresh = useCallback(async () => {
    try {
      const r = await fetch(
        `/api/itinerary?tripId=${encodeURIComponent(tripId)}`,
        { cache: "no-store" },
      );
      if (!r.ok) throw new Error();
      const data = (await r.json()) as {
        configured: boolean;
        overlay: ItineraryOverlay | null;
      };
      if (!data.configured) {
        setStatus("offline"); // KV未設定: localStorage運用
        return;
      }
      const remote = data.overlay;
      const local = overlayRef.current;
      // リビジョンが新しい方を採用（基本はサーバ優先で2台が収束）。
      if (remote && remote.rev >= local.rev) {
        commit(remote);
      } else if (!remote && isEmptyOverlay(local)) {
        commit(emptyOverlay());
      }
      setStatus("idle");
    } catch {
      setStatus("error");
    }
  }, [tripId, commit]);

  // 初回ロード: localStorageで即描画してからサーバ取得
  useEffect(() => {
    const local = readLocal(tripId);
    setOverlay(local ?? emptyOverlay());
    setStatus("loading");
    void refresh();
    // 画面復帰時に再取得（相手の端末の編集を拾う）
    const onVisible = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [tripId, refresh]);

  const save = useCallback(
    async (next: ItineraryOverlay) => {
      setStatus("saving");
      try {
        const r = await fetch("/api/itinerary", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ tripId, overlay: next }),
        });
        if (r.status === 409) {
          // 競合: サーバの最新を取り込む（相手の編集を優先）
          const data = (await r.json()) as { overlay: ItineraryOverlay };
          commit(data.overlay);
          setStatus("idle");
          return;
        }
        const data = (await r.json()) as { configured: boolean };
        setStatus(data.configured ? "idle" : "offline");
      } catch {
        setStatus("error"); // 楽観更新は維持。次回 refresh で再同期。
      }
    },
    [tripId, commit],
  );

  const apply = useCallback(
    async (ops: EditOp[]) => {
      if (!ops.length) return;
      const next = applyOps(base, overlayRef.current, ops, new Date().toISOString());
      commit(next); // 楽観更新（即描画）
      await save(next);
    },
    [base, commit, save],
  );

  const reset = useCallback(async () => {
    const next = { ...emptyOverlay(), rev: overlayRef.current.rev + 1, updatedAt: new Date().toISOString() };
    commit(next);
    await save(next);
  }, [commit, save]);

  const itinerary = useMemo(() => applyOverlay(base, overlay), [base, overlay]);

  return {
    itinerary,
    overlay,
    status,
    edited: !isEmptyOverlay(overlay),
    apply,
    reset,
    refresh,
  };
}
