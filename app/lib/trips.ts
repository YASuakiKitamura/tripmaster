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
  /**
   * true にすると「🧭 旅の変更」の一覧から隠す（終わった旅・下書きの旅の整理用）。
   * データと resolver は残るので、選択中の旅が hidden でも表示は壊れない。
   * /admin の 👁 ボタンで切り替える。
   */
  hidden?: boolean;
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
    id: "okinawa-2026",
    name: "沖縄ドライブ",
    destination: "沖縄",
    emoji: "🌺",
    dateLabel: "2026.09.29–10.01",
    status: "ready",
    teaser: "レンタカー2泊3日。美ら海・首里・うるまの旅。",
  },
  {
    id: "himeji-okayama-renew",
    name: "明石・姫路・岡山",
    destination: "神戸・明石・姫路・岡山・倉敷",
    emoji: "🌉",
    dateLabel: "2026.07.29–07.30",
    status: "ready",
    teaser: "国内1泊2日。明石焼き・姫路城・倉敷の夜景。",
  },
  // ADMIN:TRIPS-END ▼ /admin（旅データ管理）が新しい旅をこの行の上に挿入します。残してください。
];

export const DEFAULT_TRIP_ID = "seoul-2026";

/**
 * 旅の切替メニューに出す一覧。hidden の旅は隠すが、いま選択中の旅だけは
 * 隠さない（隠した旅を選んだまま切り替え先を見失うのを防ぐため）。
 */
export function visibleTrips(currentId?: string): TripMeta[] {
  return trips.filter((t) => !t.hidden || t.id === currentId);
}

export function getTrip(id: string): TripMeta | undefined {
  return trips.find((t) => t.id === id);
}
