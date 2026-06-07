"use client";

import { useState } from "react";
import type { ItineraryItem } from "../lib/types";
import type { EditOp } from "../lib/itinerary";
import { filterByPerspective, type Perspective } from "../lib/data";
import { useNow, formatSeoulClock } from "../lib/useNow";

// AIに旅程変更を相談し、返ってきた「操作(ops)」を差分プレビューしてから適用する。
// 適用前に必ず人の確認を挟む（AIが旅程を勝手に壊さないため）。
export function AiEditPanel({
  open,
  onClose,
  itinerary,
  tripId,
  perspective,
  onApply,
}: {
  open: boolean;
  onClose: () => void;
  itinerary: ItineraryItem[];
  tripId: string;
  perspective: Perspective;
  onApply: (ops: EditOp[]) => Promise<void>;
}) {
  const now = useNow();
  const [change, setChange] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [summary, setSummary] = useState("");
  const [ops, setOps] = useState<EditOp[] | null>(null);
  const [applying, setApplying] = useState(false);

  const byId = new Map(itinerary.map((it) => [it.id, it]));

  const submit = async () => {
    if (!change.trim() || loading) return;
    setLoading(true);
    setError(false);
    setOps(null);
    setSummary("");
    const list = filterByPerspective(itinerary, perspective).map((it) => ({
      id: it.id,
      start: it.time.start,
      end: it.time.end,
      who: it.who,
      title: it.title,
    }));
    try {
      const r = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "edit",
          tripId,
          change,
          perspective,
          currentTime: now !== null ? formatSeoulClock(now) : undefined,
          itinerary: list,
        }),
      });
      if (!r.ok) throw new Error();
      const data = (await r.json()) as { summary: string; ops: EditOp[] };
      setSummary(data.summary || "");
      setOps(data.ops || []);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const describe = (op: EditOp): { tag: string; color: string; text: string } => {
    if (op.op === "add") {
      const t = [op.start && `${op.start}${op.end ? `–${op.end}` : ""}`, op.title]
        .filter(Boolean)
        .join(" ");
      return { tag: "追加", color: "var(--tag-green)", text: `${op.emoji ?? "📝"} ${t || op.title || "新規"}` };
    }
    const cur = op.id ? byId.get(op.id) : undefined;
    if (op.op === "remove") {
      return { tag: "削除", color: "var(--accent2)", text: cur?.title ?? op.id ?? "" };
    }
    const changes: string[] = [];
    if (op.start || op.end)
      changes.push(`時刻→${op.start ?? cur?.time.start ?? ""}${op.end ? `–${op.end}` : ""}`);
    if (op.title) changes.push(`名称→${op.title}`);
    if (op.who) changes.push(`担当→${op.who}`);
    if (op.emoji) changes.push(`絵文字→${op.emoji}`);
    if (op.notes) changes.push("備考を更新");
    return {
      tag: "変更",
      color: "var(--tag-blue)",
      text: `${cur?.title ?? op.id ?? ""}（${changes.join(" / ") || "更新"}）`,
    };
  };

  const accept = async () => {
    if (!ops || !ops.length) return;
    setApplying(true);
    await onApply(ops);
    setApplying(false);
    setChange("");
    setOps(null);
    setSummary("");
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center">
      <div className="max-h-[88dvh] w-full max-w-[600px] overflow-y-auto rounded-t-[18px] bg-[var(--bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-hover)] sm:rounded-[18px]">
        <div className="flex items-center justify-between">
          <h3 className="font-serif-jp text-[16px] font-bold text-[var(--accent-dark)]">
            ✏️ AIで旅程を変更
          </h3>
          <button
            onClick={onClose}
            className="text-[13px] font-bold text-[var(--text-sub)]"
          >
            閉じる
          </button>
        </div>
        <p className="mt-1 text-[12px] text-[var(--text-sub)]">
          「○○を△△に変えて」と話しかけると、AIが旅程カードの変更案を作ります。適用前に内容を確認できます。
        </p>

        <textarea
          value={change}
          onChange={(e) => setChange(e.target.value)}
          rows={3}
          placeholder="例: 昼食を13:30に30分ずらして / 広蔵市場のあとにカフェを30分追加 / 午後の買い物はキャンセル"
          className="mt-3 w-full resize-none rounded-[10px] border border-[var(--border)] bg-white p-3 text-[14px] outline-none focus:border-[var(--accent)]"
        />

        <button
          onClick={submit}
          disabled={loading || !change.trim()}
          className="mt-2 w-full rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-2.5 text-[14px] font-bold text-white disabled:opacity-50"
        >
          {loading ? "AIが変更案を作成中…" : "変更案を作る"}
        </button>

        {error && (
          <p className="mt-3 text-[13px] text-[var(--accent-dark)]">
            うまく取得できませんでした。もう一度お試しください。
          </p>
        )}

        {ops && (
          <div className="mt-3 rounded-[12px] border border-[var(--border)] bg-white p-3">
            {summary && (
              <p className="mb-2 text-[13px] leading-[1.6] text-[var(--text)]">
                ✨ {summary}
              </p>
            )}
            {ops.length === 0 ? (
              <p className="text-[12px] text-[var(--text-sub)]">
                変更は不要と判断されました。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {ops.map((op, i) => {
                  const d = describe(op);
                  return (
                    <li key={i} className="flex items-start gap-2 text-[13px]">
                      <span
                        className="mt-0.5 flex-shrink-0 rounded-[6px] px-1.5 py-0.5 text-[10px] font-bold text-white"
                        style={{ background: d.color }}
                      >
                        {d.tag}
                      </span>
                      <span className="leading-snug">{d.text}</span>
                    </li>
                  );
                })}
              </ul>
            )}
            {ops.length > 0 && (
              <div className="mt-3 flex gap-2">
                <button
                  onClick={accept}
                  disabled={applying}
                  className="flex-1 rounded-[10px] bg-[var(--accent)] py-2 text-[13px] font-bold text-white disabled:opacity-50"
                >
                  {applying ? "適用中…" : "この変更を適用"}
                </button>
                <button
                  onClick={() => {
                    setOps(null);
                    setSummary("");
                  }}
                  className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--text-sub)]"
                >
                  やり直す
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
