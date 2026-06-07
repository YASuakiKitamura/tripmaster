"use client";

import { useState } from "react";
import {
  useNow,
  useNowOffset,
  setNowOverride,
  seoulWallToMs,
  seoulDateString,
  formatSeoulClock,
} from "../lib/useNow";

// TIMENOW（現在時刻）を仮設定する管理用パネル。デモ・動作確認用。
// 実時刻との差分(offset)として保存するので、設定後も時間は進み続ける。
export function NowOverridePanel({
  open,
  onClose,
  defaultDate,
}: {
  open: boolean;
  onClose: () => void;
  defaultDate: string; // "YYYY-MM-DD"
}) {
  const now = useNow();
  const offset = useNowOffset();
  const active = offset !== 0;

  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState("09:00");

  if (!open) return null;

  const field =
    "rounded-[10px] border border-[var(--border)] bg-white p-2.5 text-[14px] outline-none focus:border-[var(--accent)] tabular-nums";

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="w-full max-w-[600px] rounded-t-[18px] bg-[var(--bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-hover)] sm:rounded-[18px]">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-jp text-[16px] font-bold text-[var(--accent-dark)]">
            🕐 現在時刻の設定（デモ用）
          </h3>
          <button
            onClick={onClose}
            className="text-[13px] font-bold text-[var(--text-sub)]"
          >
            閉じる
          </button>
        </div>

        <div className="mt-2 rounded-[10px] border border-[var(--border)] bg-white px-3 py-2 text-[12px]">
          <span className="text-[var(--text-sub)]">現在の表示時刻: </span>
          <b className="tabular-nums text-[var(--accent)]">
            {now !== null ? `${seoulDateString(now)} ${formatSeoulClock(now)}` : "--"}
          </b>
          <span className="ml-2 text-[11px] font-bold text-[var(--text-sub)]">
            {active ? "（仮設定中）" : "（ライブ）"}
          </span>
        </div>

        <p className="mt-3 text-[12px] text-[var(--text-sub)]">
          指定した時刻を「いま」として扱います（タイムラインの現在時刻ラインや進行中表示が動きます）。
        </p>

        <div className="mt-2 flex gap-2">
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${field} flex-1`}
          />
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className={`${field} flex-1`}
          />
        </div>

        <div className="mt-3 flex gap-2">
          <button
            onClick={() => {
              setNowOverride(seoulWallToMs(date, time));
              onClose();
            }}
            className="flex-1 rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-2.5 text-[14px] font-bold text-white"
          >
            この時刻にする
          </button>
          <button
            onClick={() => {
              setNowOverride(null);
              onClose();
            }}
            disabled={!active}
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2.5 text-[13px] font-bold text-[var(--text-sub)] disabled:opacity-50"
          >
            ライブに戻す
          </button>
        </div>
      </div>
    </div>
  );
}
