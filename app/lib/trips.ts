// 旅レジストリ。新しい旅(国内旅行など)を追加するときは、ここに1エントリ足し、
// status を "ready" にして app/data/trips/<id>.json を用意すれば構成を拡張できる。

export interface TripMeta {
  id: string;
  name: string; // 旅の名称（例: 弾丸ソウル 2026）
  destination: string; // 行き先（例: ソウル）
  emoji: string;
  dateLabel: string; // 表示用の日付（例: 2026.06.17（水））
  status: "ready" | "coming-soon";
  /** coming-soon の旅でティザー表示する一言 */
  teaser?: string;
}

export const trips: TripMeta[] = [
  {
    id: "seoul-2026",
    name: "弾丸ソウル 2026",
    destination: "ソウル",
    emoji: "🇰🇷",
    dateLabel: "2026.06.17（水）",
    status: "ready",
  },
  {
    id: "himeji-okayama-2026",
    name: "姫路・岡山",
    destination: "姫路・岡山",
    emoji: "🏯",
    dateLabel: "2026.07.29–07.30",
    status: "ready",
    teaser: "国内1泊2日。姫路城と岡山の旅。",
  },
  {
    id: "okinawa-2026",
    name: "沖縄ドライブ",
    destination: "沖縄",
    emoji: "🌺",
    dateLabel: "2026.09.29–10.01",
    status: "ready",
    teaser: "レンタカー2泊3日。美ら海・首里・うるまの旅。",
  },
];

export const DEFAULT_TRIP_ID = "seoul-2026";

export function getTrip(id: string): TripMeta | undefined {
  return trips.find((t) => t.id === id);
}
