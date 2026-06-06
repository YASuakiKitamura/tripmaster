"use client";

import { useResolvedTrip } from "../lib/useResolvedTrip";

const RANK_BADGE = ["🥇", "🥈", "🥉"];

export default function ToiletsPage() {
  const trip = useResolvedTrip();

  return (
    <div className="px-4 pb-8 pt-5">
      <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
        <span className="text-[22px]">🚻</span>きれいなトイレ ランキング
      </h2>
      <p className="mt-1 text-[12px] text-[var(--text-sub)]">
        清潔度の高い順。各観光名所からの距離（徒歩目安）つき。
      </p>

      <div className="mt-4 space-y-3">
        {trip.toilets.map((t) => (
          <div
            key={t.rank}
            className="rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-[24px] leading-none">
                {RANK_BADGE[t.rank - 1] ?? `#${t.rank}`}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[15px] font-bold leading-tight">{t.name}</h3>
                <p className="mt-0.5 text-[11px] text-[var(--text-sub)]">
                  📍 {t.area}
                </p>
                <p className="mt-1 text-[12px] font-bold text-[var(--accent)]">
                  {t.clean}
                </p>
              </div>
            </div>

            {/* 各観光名所からの距離 */}
            <div className="mt-3 border-t border-dashed border-[var(--border)] pt-2">
              <p className="mb-1 text-[10px] font-bold text-[var(--text-sub)]">
                観光名所からの距離
              </p>
              <div className="flex flex-col gap-1">
                {t.near.map((n, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between gap-2 text-[12px]"
                  >
                    <span className="truncate text-[var(--text)]">{n.spot}</span>
                    <span className="flex-shrink-0 rounded-full bg-[var(--bg)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-[var(--text-sub)]">
                      {n.walk}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {t.tip && (
              <div className="mt-2 rounded-[8px] bg-[var(--accent-light)] px-2.5 py-2 text-[12px] leading-[1.5] text-[var(--accent-dark)]">
                {t.tip}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-5 text-center text-[11px] text-[var(--text-sub)]">
        ※ 徒歩時間は目安です。商業施設はトイレが快適な傾向。
      </p>
    </div>
  );
}
