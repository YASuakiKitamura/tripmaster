"use client";

import { useCallback, useEffect, useState } from "react";

// 店舗・スポットに紐づく写真を「端末ローカル」に保存する軽量ストア。
// 旅程オーバーレイ（KV共有）とは別系統で、写真は各自の端末内のみ（共有しない）。
// 画像は縮小して data URL で保存する。localStorage 容量に限りがあるので枚数は控えめ前提。
const key = (tripId: string) => `tripmaster-photos:${tripId}`;
const EVT = "tripmaster-photos-changed";

// entityId（"store:<id>" / "item:<id>" など）→ data URL の配列
type PhotoMap = Record<string, string[]>;

function read(tripId: string): PhotoMap {
  try {
    const raw = localStorage.getItem(key(tripId));
    return raw ? (JSON.parse(raw) as PhotoMap) : {};
  } catch {
    return {};
  }
}

function write(tripId: string, map: PhotoMap): void {
  // 容量オーバーは呼び出し側で拾えるよう、ここでは握りつぶさず投げる
  localStorage.setItem(key(tripId), JSON.stringify(map));
  window.dispatchEvent(new CustomEvent(EVT, { detail: tripId }));
}

/** File を縮小して JPEG の data URL にする（長辺 maxDim px・品質 quality）。 */
export function downscaleImage(
  file: File,
  maxDim = 1024,
  quality = 0.6,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      const longest = Math.max(width, height);
      if (longest > maxDim) {
        const s = maxDim / longest;
        width = Math.round(width * s);
        height = Math.round(height * s);
      }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("canvas未対応"));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("画像の読み込みに失敗"));
    };
    img.src = url;
  });
}

export function usePhotos(tripId: string) {
  const [photos, setPhotos] = useState<PhotoMap>({});

  useEffect(() => {
    const refresh = () => setPhotos(read(tripId));
    refresh();
    const onEvt = (e: Event) => {
      if ((e as CustomEvent).detail === tripId) refresh();
    };
    window.addEventListener(EVT, onEvt);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener(EVT, onEvt);
      window.removeEventListener("storage", refresh);
    };
  }, [tripId]);

  // 追加：縮小→保存。容量オーバー時は QuotaExceededError を投げる（呼び出し側で通知）。
  const add = useCallback(
    async (id: string, files: FileList | File[]) => {
      const incoming: string[] = [];
      for (const f of Array.from(files)) {
        if (!f.type.startsWith("image/")) continue;
        try {
          incoming.push(await downscaleImage(f));
        } catch {
          /* 1枚失敗しても他は続行 */
        }
      }
      if (!incoming.length) return;
      const cur = read(tripId); // 他インスタンスの更新を取りこぼさないよう都度読み直す
      write(tripId, { ...cur, [id]: [...(cur[id] ?? []), ...incoming] });
    },
    [tripId],
  );

  const removeAt = useCallback(
    (id: string, index: number) => {
      const cur = read(tripId);
      const list = [...(cur[id] ?? [])];
      list.splice(index, 1);
      const next = { ...cur };
      if (list.length) next[id] = list;
      else delete next[id];
      write(tripId, next);
    },
    [tripId],
  );

  return { photos, add, removeAt };
}
