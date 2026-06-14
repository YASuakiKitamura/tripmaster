"use client";

import { useMemo } from "react";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { useGeo, distanceMeters, formatDistance } from "../lib/useGeo";
import { toiletCoord, nearbyToiletMapUrl } from "../lib/toiletGeo";
import { PageTitle } from "../components/ui";

const RANK_BADGE = ["🥇", "🥈", "🥉"];

export default function ToiletsPage() {
  const trip = useResolvedTrip();
  const { coords, status, request, clear } = useGeo();
  const near = status === "ok" && coords !== null;

  // 現在地が取れたら直線距離で近い順に。座標未登録は末尾に元の順で。
  const list = useMemo(() => {
    const withDist = trip.toilets.map((t) => {
      const c = toiletCoord(trip.id, t.rank);
      const dist = c && coords ? distanceMeters(coords, c) : null;
      return { t, dist };
    });
    if (!near) return withDist;
    return [...withDist].sort((a, b) => {
      if (a.dist === null) return 1;
      if (b.dist === null) return -1;
      return a.dist - b.dist;
    });
  }, [trip, coords, near]);

  return (
    <div className="px-4 pb-8 pt-5">
      <PageTitle
        emoji="🚻"
        title="きれいなトイレ ガイド"
        desc="清潔度の高い順。各観光名所からの距離（徒歩目安）つき。"
      />

      {/* 現在地モード */}
      <div className="mt-3 flex items-center gap-2">
        {!near ? (
          <button
            onClick={request}
            disabled={status === "loading"}
            className="rounded-full bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-3.5 py-1.5 text-[12px] font-bold text-white active:opacity-90 disabled:opacity-60"
          >
            {status === "loading" ? "現在地を取得中…" : "📍 現在地から近い順"}
          </button>
        ) : (
          <>
            <span className="rounded-full bg-[var(--accent-light)] px-3 py-1.5 text-[12px] font-bold text-[var(--accent-dark)]">
              📍 近い順に表示中（直線概算）
            </span>
            <button
              onClick={clear}
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-bold text-[var(--text-sub)]"
            >
              解除
            </button>
          </>
        )}
      </div>
      {status === "error" && (
        <p className="mt-1.5 text-[11px] text-[var(--accent2)]">
          現在地を取得できませんでした（位置情報の許可をご確認ください）。
        </p>
      )}
      {status === "unsupported" && (
        <p className="mt-1.5 text-[11px] text-[var(--accent2)]">
          この端末/ブラウザでは位置情報を使えません。
        </p>
      )}
      {near && coords && (
        <a
          href={nearbyToiletMapUrl(coords)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-[12px] font-bold text-[var(--accent)] underline"
        >
          🗺 現在地周辺のトイレを地図で探す
        </a>
      )}

      <div className="mt-4 space-y-3">
        {list.map(({ t, dist }) => (
          <div
            key={t.rank}
            className="rounded-[14px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]"
          >
            <div className="flex items-start gap-3">
              <span className="text-[24px] leading-none">
                {near ? "📍" : (RANK_BADGE[t.rank - 1] ?? `#${t.rank}`)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-[15px] font-bold leading-tight">{t.name}</h3>
                  {near && dist !== null && (
                    <span className="flex-shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[11px] font-bold tabular-nums text-white">
                      {formatDistance(dist)}
                    </span>
                  )}
                </div>
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
        ※ 徒歩時間・現在地からの距離は目安（直線概算）です。商業施設はトイレが快適な傾向。
      </p>
    </div>
  );
}
