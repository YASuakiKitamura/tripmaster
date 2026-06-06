"use client";

import { useResolvedTrip } from "../lib/useResolvedTrip";
import type { StoreHighlight } from "../lib/resolveTrip";
import { Tag, Note } from "../components/ui";

function HighlightBlock({ h }: { h: StoreHighlight }) {
  return (
    <div className="mt-2 rounded-[10px] border border-[var(--border)] bg-[var(--bg)] p-3">
      {h.label && (
        <p className="mb-1 text-[11px] font-bold text-[var(--text-sub)]">
          {h.label}
        </p>
      )}
      <p
        className={`font-black leading-[1.4] ${
          h.script ? "font-kr text-[20px]" : "text-[16px]"
        }`}
      >
        {h.primary}
      </p>
      {h.sub && (
        <p className="mt-1 whitespace-pre-line text-[12px] leading-[1.5] text-[var(--text-sub)]">
          {h.sub}
        </p>
      )}
    </div>
  );
}

export default function StoresPage() {
  const trip = useResolvedTrip();

  return (
    <div className="px-4 pb-8 pt-5">
      <h2 className="font-serif-jp flex items-center gap-2 text-[18px] font-bold text-[var(--accent-dark)]">
        <span className="text-[22px]">📍</span>店舗ガイド
      </h2>
      <p className="mt-1 text-[12px] text-[var(--text-sub)]">
        この旅で寄るお店の注文・決済ガイド。
      </p>

      <div className="mt-4 space-y-4">
        {trip.stores.map((s) => (
          <section
            key={s.id}
            className="overflow-hidden rounded-[14px] border border-[var(--border)] bg-white shadow-[var(--shadow)]"
          >
            <div className="flex items-center gap-3 border-b border-[var(--border)] p-4">
              <span className="text-[30px]">{s.emoji}</span>
              <div className="min-w-0 flex-1">
                <h3 className="text-[16px] font-bold leading-tight">
                  {s.name}
                  {s.nameSub && (
                    <span className="ml-1 text-[12px] font-normal text-[var(--text-sub)]">
                      {s.nameSub}
                    </span>
                  )}
                </h3>
                <p className="text-[11px] text-[var(--text-sub)]">
                  {s.reading} · {s.category}
                </p>
              </div>
              {s.rating != null && (
                <div className="flex-shrink-0 text-right">
                  <p className="text-[14px] font-bold text-[var(--accent)]">
                    ★ {s.rating}
                  </p>
                  {s.ratingCount && (
                    <p className="text-[10px] text-[var(--text-sub)]">
                      {s.ratingCount.toLocaleString()}件
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="p-4">
              <div className="flex flex-wrap gap-1.5">
                {s.hours && <Tag color="blue">⏰ {s.hours}</Tag>}
                {s.closedDay && <Tag color="orange">定休 {s.closedDay}</Tag>}
                {s.badge && <Tag color="green">{s.badge}</Tag>}
                {s.budget && <Tag color="purple">{s.budget}</Tag>}
                {s.payment && <Tag color="orange">{s.payment}</Tag>}
              </div>

              {(s.address || s.nearStation) && (
                <p className="mt-2 text-[12px] text-[var(--text-sub)]">
                  📌 {s.address}
                  {s.nearStation && `（${s.nearStation}）`}
                </p>
              )}

              {s.highlights.map((h, i) => (
                <HighlightBlock key={i} h={h} />
              ))}

              {s.notes && <Note>{s.notes}</Note>}

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                  s.mapQuery,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 block w-full rounded-[8px] border border-[var(--border)] bg-[var(--bg)] py-2 text-center text-[13px] font-bold text-[var(--tag-blue)] active:opacity-80"
              >
                🗺 Google マップで開く
              </a>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
