"use client";

import { getTrip, DEFAULT_TRIP_ID } from "../lib/trips";
import { useTrip } from "../lib/useTrip";

/**
 * 選択中の旅が "ready" のときだけ実コンテンツ(children)を表示。
 * "coming-soon" の旅は準備中プレースホルダを表示する。
 * 今のところ ready なのはソウルのみ。
 */
export function TripGate({ children }: { children: React.ReactNode }) {
  const [tripId, setTripId] = useTrip();
  const trip = getTrip(tripId) ?? getTrip(DEFAULT_TRIP_ID)!;

  if (trip.status === "ready") return <>{children}</>;

  return (
    <div className="flex min-h-[calc(100dvh-200px)] flex-col items-center justify-center px-6 py-12 text-center">
      <div className="text-[56px]">{trip.emoji}</div>
      <h2 className="font-serif-jp mt-3 text-[20px] font-bold text-[var(--accent-dark)]">
        {trip.name}
      </h2>
      <p className="mt-1 text-[13px] font-bold text-[var(--text-sub)]">
        {trip.dateLabel}
      </p>

      <div className="mt-5 rounded-[14px] border border-[var(--border)] bg-white p-5 shadow-[var(--shadow)]">
        <p className="text-[15px] font-bold text-[var(--accent-dark)]">
          🚧 このプランは準備中です
        </p>
        {trip.teaser && (
          <p className="mt-2 text-[13px] leading-[1.7] text-[var(--text-sub)]">
            {trip.teaser}
          </p>
        )}
      </div>

      <button
        onClick={() => setTripId(DEFAULT_TRIP_ID)}
        className="mt-6 rounded-[10px] bg-gradient-to-r from-[var(--accent)] to-[var(--accent-dark)] px-5 py-2.5 text-[14px] font-bold text-white active:opacity-90"
      >
        ← {getTrip(DEFAULT_TRIP_ID)!.name} を見る
      </button>
    </div>
  );
}
