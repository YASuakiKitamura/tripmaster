"use client";

import { useState } from "react";
import type { ItineraryItem } from "../lib/types";
import type { EditOp } from "../lib/itinerary";

// 手動の追加/編集フォーム（AIが外したときの微修正用フォールバック）。
// 編集なら item を渡す。追加なら item=null。who候補は whoOptions で渡す。
export function ItineraryItemForm({
  item,
  whoOptions,
  onSubmit,
  onCancel,
}: {
  item: ItineraryItem | null;
  whoOptions: string[];
  onSubmit: (op: EditOp) => Promise<void>;
  onCancel: () => void;
}) {
  const editing = !!item;
  const [title, setTitle] = useState(item?.title ?? "");
  const [emoji, setEmoji] = useState(item?.emoji ?? "📝");
  const [start, setStart] = useState(item?.time.start ?? "12:00");
  const [end, setEnd] = useState(item?.time.end ?? "13:00");
  const [who, setWho] = useState(item?.who ?? whoOptions[0] ?? "夫婦");
  const [notes, setNotes] = useState(item?.notes ?? "");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!title.trim() || busy) return;
    setBusy(true);
    const op: EditOp = editing
      ? { op: "update", id: item!.id, title, emoji, start, end, who, notes }
      : { op: "add", title, emoji, start, end, who, notes };
    await onSubmit(op);
    setBusy(false);
  };

  const field = "w-full rounded-[10px] border border-[var(--border)] bg-white p-2.5 text-[14px] outline-none focus:border-[var(--accent)]";

  return (
    <div className="fixed inset-0 z-[110] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[88dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[18px] bg-[var(--bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-hover)] sm:rounded-[18px]">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-jp text-[16px] font-bold text-[var(--accent-dark)]">
            {editing ? "予定を編集" : "予定を追加"}
          </h3>
          <button
            onClick={onCancel}
            className="text-[13px] font-bold text-[var(--text-sub)]"
          >
            閉じる
          </button>
        </div>

        <div className="mt-3 space-y-2.5">
          <div className="flex gap-2">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value)}
              className={`${field} w-[64px] text-center`}
              aria-label="絵文字"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="予定の名前"
              className={field}
            />
          </div>
          <div className="flex gap-2">
            <label className="flex-1 text-[11px] font-bold text-[var(--text-sub)]">
              開始
              <input
                type="time"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className={`${field} mt-1 tabular-nums`}
              />
            </label>
            <label className="flex-1 text-[11px] font-bold text-[var(--text-sub)]">
              終了
              <input
                type="time"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className={`${field} mt-1 tabular-nums`}
              />
            </label>
          </div>
          <label className="block text-[11px] font-bold text-[var(--text-sub)]">
            担当
            <select
              value={who}
              onChange={(e) => setWho(e.target.value)}
              className={`${field} mt-1`}
            >
              {whoOptions.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="備考（任意）"
            className={`${field} resize-none`}
          />
        </div>

        <button
          onClick={save}
          disabled={busy || !title.trim()}
          className="mt-3 w-full rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {busy ? "保存中…" : editing ? "変更を保存" : "追加する"}
        </button>
      </div>
    </div>
  );
}
