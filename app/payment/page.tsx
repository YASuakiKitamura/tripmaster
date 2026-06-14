"use client";

import { useEffect, useState } from "react";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { Tag, Note, PageTitle } from "../components/ui";

export default function PaymentPage() {
  const trip = useResolvedTrip();
  const { strategy, methods, currency, initialCash } = trip.payment;
  const storageKey = `tripmaster-cash-${trip.id}`;

  const [balance, setBalance] = useState<number | null>(null);
  const [delta, setDelta] = useState("");

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    setBalance(saved !== null ? Number(saved) : initialCash);
  }, [storageKey, initialCash]);

  const update = (next: number) => {
    const v = Math.max(0, Math.round(next));
    setBalance(v);
    localStorage.setItem(storageKey, String(v));
  };

  const applyDelta = (sign: 1 | -1) => {
    const n = Number(delta.replace(/[, ]/g, ""));
    if (!Number.isFinite(n) || n === 0 || balance === null) return;
    update(balance + sign * n);
    setDelta("");
  };

  return (
    <div className="px-4 pb-8 pt-5">
      <PageTitle emoji="💳" title="決済ガイド" desc={strategy} />

      {/* 現金残高トラッカー */}
      <div className="mt-4 rounded-[14px] border border-[var(--accent)] bg-gradient-to-br from-[var(--accent)] to-[var(--accent-dark)] p-4 text-white shadow-[var(--shadow-hover)]">
        <p className="text-[12px] font-bold opacity-85">現金残高（手動管理）</p>
        <p className="mt-1 text-[34px] font-bold tabular-nums">
          {currency}
          {balance === null ? "—" : balance.toLocaleString()}
        </p>
        <div className="mt-3 flex gap-2">
          <input
            inputMode="numeric"
            value={delta}
            onChange={(e) => setDelta(e.target.value)}
            placeholder="金額"
            className="w-full rounded-[8px] border-0 bg-white/95 px-3 py-2 text-[16px] font-bold text-[var(--text)] tabular-nums outline-none placeholder:text-[var(--text-sub)]"
          />
          <button
            onClick={() => applyDelta(-1)}
            className="flex-shrink-0 rounded-[8px] bg-white/20 px-4 py-2 text-[15px] font-bold active:bg-white/30"
          >
            − 使う
          </button>
          <button
            onClick={() => applyDelta(1)}
            className="flex-shrink-0 rounded-[8px] bg-white/20 px-4 py-2 text-[15px] font-bold active:bg-white/30"
          >
            ＋ 補充
          </button>
        </div>
        <button
          onClick={() => update(initialCash)}
          className="mt-2 text-[11px] font-bold underline opacity-80"
        >
          初期額（{currency}
          {initialCash.toLocaleString()}）にリセット
        </button>
      </div>

      {/* 決済手段 */}
      <div className="mt-5 space-y-3">
        {methods.map((m) => (
          <div
            key={m.name}
            className="rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-[15px] font-bold">
                {m.emoji} {m.name}
              </h3>
              {m.badge && <Tag color="orange">{m.badge}</Tag>}
            </div>
            {m.role && (
              <p className="mt-1 text-[12px] text-[var(--text-sub)]">{m.role}</p>
            )}
            {m.balances && (
              <div className="mt-2 flex gap-2">
                {m.balances.map((b) => (
                  <div
                    key={b.name}
                    className="flex-1 rounded-[8px] bg-[var(--bg)] px-3 py-2 text-center"
                  >
                    <p className="text-[11px] text-[var(--text-sub)]">{b.name}</p>
                    <p className="text-[16px] font-bold tabular-nums">
                      {currency}
                      {b.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
            {m.note && <Note>{m.note}</Note>}
          </div>
        ))}
      </div>
    </div>
  );
}
