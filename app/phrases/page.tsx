"use client";

import { useState } from "react";
import { phraseCategories } from "../lib/phrases";
import type { Phrase } from "../lib/types";
import { Tag, PageTitle } from "../components/ui";
import { useResolvedTrip } from "../lib/useResolvedTrip";

export default function PhrasesPage() {
  const trip = useResolvedTrip();
  const [active, setActive] = useState(phraseCategories[0].id);
  const [staff, setStaff] = useState<Phrase | null>(null);

  const category = phraseCategories.find((c) => c.id === active)!;

  if (!trip.hasPhrases) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 text-center">
        <div className="text-[40px]">💬</div>
        <p className="mt-3 text-[14px] font-bold text-[var(--text-sub)]">
          この旅にはフレーズ集はありません
        </p>
        <p className="mt-1 text-[12px] text-[var(--text-sub)]">
          （国内旅行のため不要です）
        </p>
      </div>
    );
  }

  return (
    <div className="pb-8">
      <div className="px-4 pt-5">
        <PageTitle
          emoji="💬"
          title="会話フレーズ"
          desc="「店員に見せる」で韓国語を全画面表示できます。"
        />
      </div>

      {/* カテゴリタブ（横スクロール・sticky） */}
      <div className="no-scrollbar sticky top-[68px] z-30 mt-3 flex gap-2 overflow-x-auto border-b border-[var(--border)] bg-[var(--bg)]/95 px-4 py-2 backdrop-blur-sm">
        {phraseCategories.map((c) => (
          <button
            key={c.id}
            onClick={() => setActive(c.id)}
            className={`flex-shrink-0 rounded-full border px-3.5 py-1.5 text-[13px] font-bold transition-colors ${
              active === c.id
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border)] bg-white text-[var(--text-sub)]"
            }`}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <p className="px-4 pt-3 text-[12px] text-[var(--text-sub)]">
        {category.desc}
      </p>

      <div className="space-y-2.5 px-4 pt-2">
        {category.phrases.map((p, i) => (
          <div
            key={i}
            className={`rounded-[12px] border bg-white p-4 shadow-[var(--shadow)] ${
              p.big
                ? "border-2 border-[var(--accent)]"
                : "border-[var(--border)]"
            }`}
          >
            {p.situation && (
              <p className="mb-2 border-b border-dashed border-[var(--border)] pb-1.5 text-[12px] font-bold text-[var(--text-sub)]">
                {p.situation}
              </p>
            )}
            <p
              className={`font-kr font-black leading-[1.4] text-[var(--text)] ${
                p.big ? "text-[26px]" : "text-[22px]"
              }`}
            >
              {p.korean}
            </p>
            <p className="mt-1 text-[14px] font-bold text-[var(--accent)]">
              {p.reading}
            </p>
            <p className="mt-1 text-[13px] leading-[1.5] text-[var(--text-sub)]">
              {p.meaning}
            </p>

            {p.tags && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {p.tags.map((t, j) => (
                  <Tag key={j} color={t.color}>
                    {t.label}
                  </Tag>
                ))}
              </div>
            )}
            {p.note && (
              <div className="mt-2 rounded-[8px] bg-[var(--accent-light)] px-2.5 py-2 text-[12px] leading-[1.5] text-[var(--accent-dark)]">
                {p.note}
              </div>
            )}

            <button
              onClick={() => setStaff(p)}
              className="mt-3 w-full rounded-[8px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] py-2 text-[13px] font-bold tracking-[0.05em] text-white active:opacity-90"
            >
              📱 店員に見せる
            </button>
          </div>
        ))}
      </div>

      {/* 店員に見せる：全画面モーダル */}
      {staff && (
        <div
          onClick={() => setStaff(null)}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white px-6"
        >
          <p className="absolute top-[calc(env(safe-area-inset-top)+16px)] text-[13px] font-bold text-[var(--text-sub)]">
            ▼ 점원에게 보여주세요 ▼
          </p>
          <p className="font-kr text-center text-[38px] font-black leading-[1.35] text-[var(--text)]">
            {staff.korean}
          </p>
          <p className="mt-4 text-center text-[14px] text-[var(--text-sub)]">
            {staff.reading}
            <br />
            {staff.meaning}
          </p>
          <button
            onClick={() => setStaff(null)}
            className="absolute bottom-[calc(env(safe-area-inset-bottom)+24px)] rounded-full border border-[var(--border)] bg-white px-6 py-2.5 text-[14px] font-bold text-[var(--text-sub)] shadow-[var(--shadow)]"
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
