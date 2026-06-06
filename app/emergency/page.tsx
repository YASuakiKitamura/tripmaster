"use client";

import { useResolvedTrip } from "../lib/useResolvedTrip";

export default function EmergencyPage() {
  const trip = useResolvedTrip();
  const e = trip.emergency;

  return (
    <div className="px-4 pb-8 pt-5">
      <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
        <span className="text-[22px]">🆘</span>緊急対応
      </h2>

      {/* 最重要警告 */}
      <div className="mt-3 rounded-[12px] border-2 border-[var(--accent2)] bg-[var(--accent-light)] p-4">
        <p className="text-[14px] font-bold text-[var(--accent2)]">
          ⚠️ {e.warning.title}
        </p>
        {e.warning.note && (
          <p className="mt-1 text-[12px] leading-[1.6] text-[var(--text)]">
            {e.warning.note}
          </p>
        )}
      </div>

      {/* 安全網 */}
      {e.safetyNets.length > 0 && (
        <>
          <h3 className="mt-5 text-[14px] font-bold text-[var(--text-sub)]">
            🛡 安全網
          </h3>
          <ol className="mt-2 space-y-2">
            {e.safetyNets.map((net, i) => (
              <li
                key={i}
                className="flex gap-3 rounded-[12px] border border-[var(--border)] bg-white p-3 shadow-[var(--shadow)]"
              >
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[13px] font-bold text-white">
                  {i + 1}
                </span>
                <span className="text-[13px] leading-[1.5]">{net}</span>
              </li>
            ))}
          </ol>
        </>
      )}

      {/* 乗り遅れた場合 */}
      {e.ifMissed && (
        <>
          <h3 className="mt-5 text-[14px] font-bold text-[var(--text-sub)]">
            🚨 間に合わなかったら
          </h3>
          <div className="mt-2 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
            <p className="text-[13px] leading-[1.6]">{e.ifMissed}</p>
          </div>
        </>
      )}

      {/* 追加セクション */}
      {e.sections.map((sec, i) => (
        <div key={i}>
          <h3 className="mt-5 text-[14px] font-bold text-[var(--text-sub)]">
            {sec.title}
          </h3>
          <div className="mt-2 rounded-[12px] border border-[var(--border)] bg-white p-4 shadow-[var(--shadow)]">
            <ul className="space-y-1 text-[12px] leading-[1.6] text-[var(--text)]">
              {sec.lines.map((line, j) => (
                <li key={j}>• {line}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  );
}
