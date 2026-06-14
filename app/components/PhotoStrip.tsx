"use client";

import { useRef, useState } from "react";
import { useTrip } from "../lib/useTrip";
import { usePhotos } from "../lib/usePhotos";

/**
 * 店舗・スポットに写真を追加できる共通UI（端末ローカル保存）。
 * id は "store:<id>" / "item:<id>" のように呼び出し側で名前空間を付ける。
 */
export function PhotoStrip({
  id,
  label = "📷 写真メモ",
}: {
  id: string;
  label?: string;
}) {
  const [tripId] = useTrip();
  const { photos, add, removeAt } = usePhotos(tripId);
  const list = photos[id] ?? [];
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [viewer, setViewer] = useState<number | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setBusy(true);
    try {
      await add(id, files);
    } catch {
      alert(
        "端末の保存容量がいっぱいで、これ以上保存できませんでした。古い写真を削除してからお試しください。",
      );
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="mt-3">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-bold text-[var(--text-sub)]">{label}</p>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--accent)] active:bg-[var(--bg)] disabled:opacity-50"
        >
          {busy ? "保存中…" : "＋ 写真を追加"}
        </button>
      </div>

      {list.length > 0 ? (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {list.map((src, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setViewer(i)}
              className="h-[68px] w-[68px] flex-shrink-0 overflow-hidden rounded-[10px] border border-[var(--border)] active:opacity-80"
            >
              {/* 端末内 data URL の表示。next/image は不要 */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt={`写真 ${i + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-[var(--text-sub)]">
          まだ写真はありません。「＋ 写真を追加」から撮影・選択できます（この端末内のみに保存）。
        </p>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={onPick}
      />

      {/* 拡大ビューア */}
      {viewer != null && list[viewer] && (
        <div
          className="fixed inset-0 z-[120] flex flex-col items-center justify-center bg-black/85 p-4"
          onClick={() => setViewer(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={list[viewer]}
            alt="拡大写真"
            className="max-h-[80vh] max-w-full rounded-[10px] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="mt-4 flex gap-3" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                removeAt(id, viewer);
                setViewer(null);
              }}
              className="rounded-[10px] border border-white/40 bg-white/10 px-4 py-2 text-[13px] font-bold text-white active:opacity-80"
            >
              🗑 削除
            </button>
            <button
              type="button"
              onClick={() => setViewer(null)}
              className="rounded-[10px] bg-white px-4 py-2 text-[13px] font-bold text-black active:opacity-80"
            >
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
