"use client";

import { useState } from "react";
import { trips } from "../lib/trips";
import { useTrip } from "../lib/useTrip";

export function TripSwitcher() {
  const [tripId, setTripId] = useTrip();
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-bold active:bg-white/30"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        🧭 旅の変更
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[90]"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div
            role="menu"
            className="absolute right-0 z-[100] mt-1.5 w-[238px] overflow-hidden rounded-[12px] border border-[var(--border)] bg-white text-[var(--text)] shadow-[var(--shadow-hover)]"
          >
            {trips.map((t) => {
              const active = t.id === tripId;
              return (
                <button
                  key={t.id}
                  role="menuitemradio"
                  aria-checked={active}
                  onClick={() => {
                    setTripId(t.id);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center gap-2 border-b border-[var(--border)] px-3 py-2.5 text-left last:border-0 active:bg-[var(--bg)] ${
                    active ? "bg-[var(--accent-light)]" : ""
                  }`}
                >
                  <span className="text-[18px]">{t.emoji}</span>
                  <span className="flex-1 leading-tight">
                    <span
                      className={`block text-[13px] ${
                        active
                          ? "font-bold text-[var(--accent-dark)]"
                          : "font-bold"
                      }`}
                    >
                      {t.name}
                    </span>
                    <span className="block text-[10px] font-normal text-[var(--text-sub)]">
                      {t.dateLabel}
                      {t.status === "coming-soon" ? " ・準備中" : ""}
                    </span>
                  </span>
                  {active && (
                    <span className="text-[14px] font-bold text-[var(--accent)]">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
            <a
              href="/admin"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 border-t border-[var(--border)] px-3 py-2.5 text-left text-[var(--text-sub)] active:bg-[var(--bg)]"
            >
              <span className="text-[18px]">🛠</span>
              <span className="flex-1 text-[12px] font-bold leading-tight">
                旅データ管理
              </span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
