"use client";

import { useMemo, useState } from "react";
import {
  itineraryStartMs,
  itineraryEndMs,
  WHO_COLORS,
} from "../lib/data";
import type { ItineraryItem } from "../lib/types";
import type { Leg } from "../lib/resolveTrip";
import {
  formatSeoulClock,
  seoulDateString,
  seoulDateLabel,
  seoulWallToMs,
} from "../lib/useNow";
import { getPlaceLink, mapUrl } from "../lib/placeLinks";
import { PhotoStrip } from "./PhotoStrip";

// Googleカレンダー風の時間比例レイアウト。
// ・各カードは最低 MIN_BLOCK_PX の高さを確保（短い予定でも読める）
// ・30分以上は所要時間に比例して高くなる（PX_PER_MIN）
// ・現在時刻(now)に赤い横線（TIMENOW）を引く
// ・重なる予定（混合ビューの別行動）は横に並べる
const PX_PER_MIN = 1.7;
const MIN_BLOCK_PX = 46;
const GUTTER = 46; // 左の時刻メモリ幅
const HOUR = 3_600_000;

interface Block {
  item: ItineraryItem;
  topPx: number;
  heightPx: number;
  startMs: number;
  endMs: number;
  lane: number;
  laneCount: number;
}

interface Transport {
  leg: Leg;
  topPx: number;
  heightPx: number;
  crossesMidnight: boolean;
}

interface DayGroup {
  date: string;
  label: string;
  gridStartMs: number;
  gridEndMs: number;
  blocks: Block[];
  transports: Transport[];
}

function shiftDateStr(d: string, delta: number): string {
  return seoulDateString(seoulWallToMs(d, "12:00") + delta * 24 * HOUR);
}

function layoutBlocks(raw: Omit<Block, "lane" | "laneCount">[]): void {
  // ピクセル範囲が重なるものをクラスタにまとめ、レーン（列）を割り当てる
  const blocks = raw as Block[];
  blocks.sort((a, b) => a.topPx - b.topPx || a.startMs - b.startMs);
  let cluster: Block[] = [];
  let clusterBottom = -1;

  const finalize = (c: Block[]) => {
    const laneEnds: number[] = [];
    for (const b of c) {
      let lane = laneEnds.findIndex((end) => end <= b.topPx + 0.5);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(b.topPx + b.heightPx);
      } else {
        laneEnds[lane] = b.topPx + b.heightPx;
      }
      b.lane = lane;
    }
    c.forEach((b) => (b.laneCount = laneEnds.length));
  };

  for (const b of blocks) {
    if (cluster.length && b.topPx < clusterBottom - 0.5) {
      cluster.push(b);
      clusterBottom = Math.max(clusterBottom, b.topPx + b.heightPx);
    } else {
      if (cluster.length) finalize(cluster);
      cluster = [b];
      clusterBottom = b.topPx + b.heightPx;
    }
  }
  if (cluster.length) finalize(cluster);
}

export function TimelineCalendar({
  items,
  legs,
  tripId,
  now,
  completed,
  onEdit,
  onDelete,
  onToggleComplete,
  onShiftAfter,
}: {
  items: ItineraryItem[];
  legs?: { outbound: Leg; return: Leg };
  tripId: string;
  now: number | null;
  completed: Set<string>;
  onEdit: (item: ItineraryItem) => void;
  onDelete: (item: ItineraryItem) => void;
  onToggleComplete: (id: string) => void;
  onShiftAfter: (item: ItineraryItem, deltaMin: number) => void;
}) {
  const [selected, setSelected] = useState<string | null>(null);

  const groups = useMemo<DayGroup[]>(() => {
    const byDate = new Map<string, ItineraryItem[]>();
    for (const it of items) {
      const key = seoulDateString(itineraryStartMs(it));
      const arr = byDate.get(key) ?? [];
      arr.push(it);
      byDate.set(key, arr);
    }
    const dates = Array.from(byDate.keys()).sort((a, b) => a.localeCompare(b));

    // 便（移動）を「実際の日付」に割り当てる。便にdateが無く深夜便で日跨ぎするため、
    // 往路は到着が最初の予定に最も近い日、復路は出発が最後の予定に最も近い日を選ぶ。
    const legByDate = new Map<
      string,
      { leg: Leg; startMs: number; endMs: number; cross: boolean }[]
    >();
    if (legs && dates.length) {
      const starts0 = items.map(itineraryStartMs);
      const ends0 = items.map(itineraryEndMs);
      const earliest = Math.min(...starts0);
      const latestEnd = Math.max(...ends0);
      const candDates = Array.from(
        new Set([
          shiftDateStr(dates[0], -1),
          ...dates,
          shiftDateStr(dates[dates.length - 1], 1),
        ]),
      );
      const legAbs = (d: string, leg: Leg) => {
        const start = seoulWallToMs(d, leg.fromTime);
        let end = seoulWallToMs(d, leg.toTime);
        const cross = end <= start;
        if (cross) end += 24 * HOUR;
        return { start, end, cross };
      };
      const pickDate = (leg: Leg, score: (a: { start: number; end: number }) => number) =>
        candDates.reduce(
          (best, d) => (score(legAbs(d, leg)) < score(legAbs(best, leg)) ? d : best),
          candDates[0],
        );
      const push = (d: string, leg: Leg) => {
        const a = legAbs(d, leg);
        // 通常便は実際の到着まで表示。深夜跨ぎ便だけグリッドが伸びすぎないよう90分に丸める。
        const visEnd = a.cross ? a.start + 90 * 60000 : a.end;
        const key = seoulDateString(a.start);
        const arr = legByDate.get(key) ?? [];
        arr.push({ leg, startMs: a.start, endMs: visEnd, cross: a.cross });
        legByDate.set(key, arr);
      };
      // 往路: 到着が最初の予定に最も近い日 / 復路: 出発が最後の予定に最も近い日
      push(pickDate(legs.outbound, (a) => Math.abs(a.end - earliest)), legs.outbound);
      push(pickDate(legs.return, (a) => Math.abs(a.start - latestEnd)), legs.return);
    }

    // 予定のある日 ∪ 便のある日
    const groupDates = Array.from(
      new Set([...dates, ...legByDate.keys()]),
    ).sort((a, b) => a.localeCompare(b));

    return groupDates.map((date) => {
      const list = byDate.get(date) ?? [];
      const legList = legByDate.get(date) ?? [];
      const starts = [...list.map(itineraryStartMs), ...legList.map((l) => l.startMs)];
      const ends = [...list.map(itineraryEndMs), ...legList.map((l) => l.endMs)];
      const gridStartMs = Math.floor(Math.min(...starts) / HOUR) * HOUR;
      const gridEndMs = Math.max(
        Math.ceil(Math.max(...ends) / HOUR) * HOUR,
        gridStartMs + HOUR,
      );
      const raw = list.map((it) => {
        const startMs = itineraryStartMs(it);
        const endMs = Math.max(itineraryEndMs(it), startMs);
        const durMin = (endMs - startMs) / 60000;
        return {
          item: it,
          startMs,
          endMs,
          topPx: ((startMs - gridStartMs) / 60000) * PX_PER_MIN,
          heightPx: Math.max(MIN_BLOCK_PX, durMin * PX_PER_MIN),
        };
      });
      layoutBlocks(raw);
      const transports: Transport[] = legList.map((l) => ({
        leg: l.leg,
        crossesMidnight: l.cross,
        topPx: ((l.startMs - gridStartMs) / 60000) * PX_PER_MIN,
        heightPx: Math.max(MIN_BLOCK_PX, ((l.endMs - l.startMs) / 60000) * PX_PER_MIN),
      }));
      return {
        date,
        label: seoulDateLabel(gridStartMs),
        gridStartMs,
        gridEndMs,
        blocks: raw as Block[],
        transports,
      };
    });
  }, [items, legs]);

  const selectedItem = items.find((it) => it.id === selected) ?? null;
  const multiDay = groups.length > 1;

  if (groups.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-[13px] text-[var(--text-sub)]">
        この視点の予定はありません。
      </p>
    );
  }

  return (
    <div className="px-3">
      {groups.map((g) => {
        const heightPx = ((g.gridEndMs - g.gridStartMs) / 60000) * PX_PER_MIN + 8;
        const hours: number[] = [];
        for (let t = g.gridStartMs; t <= g.gridEndMs; t += HOUR) hours.push(t);
        const showNow =
          now !== null &&
          seoulDateString(now) === g.date &&
          now >= g.gridStartMs &&
          now <= g.gridEndMs;
        const nowTop = showNow
          ? ((now! - g.gridStartMs) / 60000) * PX_PER_MIN
          : 0;

        return (
          <section key={g.date} className="mt-3">
            {multiDay && (
              <h3 className="mb-1 px-1 text-[13px] font-bold text-[var(--accent-dark)]">
                {g.label}
              </h3>
            )}
            <div className="relative" style={{ height: heightPx }}>
              {/* 時刻メモリ（横罫線＋ラベル） */}
              {hours.map((t) => {
                const top = ((t - g.gridStartMs) / 60000) * PX_PER_MIN;
                return (
                  <div
                    key={t}
                    className="absolute inset-x-0 flex items-start"
                    style={{ top }}
                  >
                    <span
                      className="-mt-1.5 w-[40px] flex-shrink-0 pr-1 text-right text-[10px] tabular-nums text-[var(--text-sub)]"
                    >
                      {formatSeoulClock(t)}
                    </span>
                    <span className="mt-px h-px flex-1 bg-[var(--border)]" />
                  </div>
                );
              })}

              {/* 便（移動）バンド：背面に全幅で表示 */}
              {g.transports.map((t, i) => (
                <div
                  key={`leg-${i}`}
                  className="absolute overflow-hidden rounded-[8px] border border-dashed border-[var(--accent)] bg-[var(--accent-light)]"
                  style={{
                    top: t.topPx,
                    height: t.heightPx - 2,
                    left: GUTTER,
                    right: 0,
                  }}
                >
                  <div className="px-2.5 py-1">
                    <p className="text-[12px] font-bold leading-[1.2] text-[var(--accent-dark)]">
                      {t.leg.emoji} {t.leg.kind}
                      {t.leg.name ? ` ${t.leg.name}` : ""}
                      {t.leg.isLast && (
                        <span className="ml-1 align-middle text-[9px] font-bold text-[var(--accent2)]">
                          最終
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 text-[10px] tabular-nums text-[var(--accent-dark)]">
                      {t.leg.fromLabel} {t.leg.fromTime} → {t.leg.toLabel}{" "}
                      {t.leg.toTime}
                      {(t.leg.nextDay || t.crossesMidnight) && (
                        <sup className="text-[var(--accent)]">+1</sup>
                      )}
                    </p>
                  </div>
                </div>
              ))}

              {/* 予定ブロック */}
              {g.blocks.map((b) => {
                const it = b.item;
                const c = WHO_COLORS[it.who] ?? WHO_COLORS["夫婦"];
                const isNow =
                  now !== null && now >= b.startMs && now < b.endMs;
                const isPast = now !== null && now >= b.endMs;
                const isAdded = it.id.startsWith("x-");
                const isDone = completed.has(it.id);
                const compact = b.heightPx < 56;
                const leftCalc = `calc(${GUTTER}px + (100% - ${GUTTER}px) * ${b.lane} / ${b.laneCount})`;
                const widthCalc = `calc((100% - ${GUTTER}px) / ${b.laneCount} - 4px)`;
                return (
                  <button
                    key={it.id}
                    onClick={() => setSelected(it.id)}
                    className={`absolute overflow-hidden rounded-[8px] border bg-white text-left shadow-[var(--shadow)] transition-all active:scale-[0.99] ${
                      isNow
                        ? "border-[var(--accent)] ring-1 ring-[var(--accent)]"
                        : "border-[var(--border)]"
                    } ${isPast || isDone ? "opacity-55" : ""}`}
                    style={{
                      top: b.topPx,
                      height: b.heightPx - 2,
                      left: leftCalc,
                      width: widthCalc,
                    }}
                  >
                    {/* 担当カラーの左バー */}
                    <span
                      className={`absolute inset-y-0 left-0 w-[3px] ${c.dot}`}
                    />
                    <div className="h-full py-1 pl-2.5 pr-1.5">
                      <p
                        className={`font-bold leading-[1.2] ${
                          compact ? "text-[12px] line-clamp-1" : "text-[13px] line-clamp-2"
                        } ${isDone ? "line-through" : ""}`}
                      >
                        {isDone ? "✅ " : ""}
                        {it.emoji} {it.title}
                        {isAdded && (
                          <span className="ml-1 align-middle text-[9px] font-bold text-[var(--tag-green)]">
                            ＋
                          </span>
                        )}
                      </p>
                      {!compact && (
                        <p className="mt-0.5 text-[10px] tabular-nums text-[var(--text-sub)]">
                          {it.time.start}–{it.time.end}
                          <span className={`ml-1 ${c.text}`}>· {it.who}</span>
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}

              {/* 現在時刻ライン（TIMENOW） */}
              {showNow && (
                <div
                  className="pointer-events-none absolute inset-x-0 z-10 flex items-center"
                  style={{ top: nowTop }}
                >
                  <span className="w-[40px] flex-shrink-0 pr-1 text-right text-[10px] font-bold tabular-nums text-[var(--accent)]">
                    {formatSeoulClock(now!)}
                  </span>
                  <span className="relative h-[2px] flex-1 bg-[var(--accent)]">
                    <span className="absolute -left-0.5 -top-[3px] h-2 w-2 rounded-full bg-[var(--accent)]" />
                  </span>
                </div>
              )}
            </div>
          </section>
        );
      })}

      {/* 詳細シート */}
      {selectedItem && (
        <DetailSheet
          item={selectedItem}
          tripId={tripId}
          done={completed.has(selectedItem.id)}
          onClose={() => setSelected(null)}
          onEdit={() => {
            setSelected(null);
            onEdit(selectedItem);
          }}
          onDelete={() => {
            setSelected(null);
            onDelete(selectedItem);
          }}
          onToggleComplete={() => onToggleComplete(selectedItem.id)}
          onShiftAfter={(delta) => {
            onShiftAfter(selectedItem, delta);
            setSelected(null);
          }}
        />
      )}
    </div>
  );
}

function DetailSheet({
  item,
  tripId,
  done,
  onClose,
  onEdit,
  onDelete,
  onToggleComplete,
  onShiftAfter,
}: {
  item: ItineraryItem;
  tripId: string;
  done: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onShiftAfter: (deltaMin: number) => void;
}) {
  const c = WHO_COLORS[item.who] ?? WHO_COLORS["夫婦"];
  const pl = getPlaceLink(tripId, item.id);
  const shifts = [-30, -15, 15, 30, 60];
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/40 sm:items-center"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[600px] rounded-t-[18px] bg-[var(--bg)] p-4 pb-[calc(env(safe-area-inset-bottom)+16px)] shadow-[var(--shadow-hover)] sm:rounded-[18px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[17px] font-bold leading-snug">
            {item.emoji} {item.title}
          </p>
          <span
            className={`flex-shrink-0 rounded-[8px] px-1.5 py-0.5 text-[10px] font-bold ${c.bg} ${c.text}`}
          >
            {item.who}
          </span>
        </div>
        <p className="mt-1 text-[12px] tabular-nums text-[var(--text-sub)]">
          {item.time.start} – {item.time.end}
        </p>
        {item.notes && (
          <p className="mt-2 text-[13px] leading-[1.65] text-[var(--text-sub)]">
            {item.notes}
          </p>
        )}
        {pl && (
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={mapUrl(tripId, pl)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--accent)] active:opacity-80"
            >
              🗺 地図で開く
            </a>
            {pl.info && (
              <a
                href={pl.info.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1 text-[12px] font-bold text-[var(--accent)] active:opacity-80"
              >
                🔗 {pl.info.label}
              </a>
            )}
          </div>
        )}
        <PhotoStrip id={`item:${item.id}`} />
        {/* 実績打刻＆以降のずらし */}
        <div className="mt-3 border-t border-dashed border-[var(--border)] pt-3">
          <button
            onClick={onToggleComplete}
            className={`w-full rounded-[10px] border py-2 text-[13px] font-bold active:opacity-90 ${
              done
                ? "border-[var(--border)] bg-[var(--bg)] text-[var(--text-sub)]"
                : "border-[var(--tag-green)] bg-white text-[var(--tag-green)]"
            }`}
          >
            {done ? "✅ 完了済み（取り消す）" : "✓ 完了にする"}
          </button>
          <p className="mt-3 text-[11px] font-bold text-[var(--text-sub)]">
            押した分だけ、この予定より後ろを全部ずらす
          </p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {shifts.map((d) => (
              <button
                key={d}
                onClick={() => onShiftAfter(d)}
                className="rounded-full border border-[var(--border)] bg-white px-3 py-1.5 text-[12px] font-bold tabular-nums text-[var(--accent)] active:bg-[var(--bg)]"
              >
                {d > 0 ? `+${d}` : d}分
              </button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex gap-2 border-t border-dashed border-[var(--border)] pt-3">
          <button
            onClick={onEdit}
            className="flex-1 rounded-[10px] bg-[var(--accent)] py-2 text-[13px] font-bold text-white active:opacity-90"
          >
            ✏️ 編集
          </button>
          <button
            onClick={onDelete}
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--accent2)] active:bg-[var(--bg)]"
          >
            🗑 削除
          </button>
          <button
            onClick={onClose}
            className="rounded-[10px] border border-[var(--border)] bg-white px-4 py-2 text-[13px] font-bold text-[var(--text-sub)]"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
