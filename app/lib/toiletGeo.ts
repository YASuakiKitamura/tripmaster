import type { Coords } from "./useGeo";

// トイレ地点の概算座標（ランク基準・直線距離の並べ替え用）。
// ナビは地点名/外部地図で行う前提なので、ここは「近い順」表示のための目安。
const SEOUL_BY_RANK: Record<number, [number, number]> = {
  1: [37.5647, 126.9817], // ロッテ百貨店 本店（明洞）
  2: [37.4486, 126.4506], // 仁川空港 T1
  3: [37.5547, 126.9707], // ソウル駅
  4: [37.5668, 127.0085], // 斗山타워/現代アウトレット東大門
  5: [37.5701, 126.9997], // 広蔵市場
  6: [36.3315, 127.4348], // 大田駅
  7: [37.5601, 126.981], // 新世界百貨店 本店（会賢）
  8: [37.563, 126.984], // 明洞駅/乙支路入口駅
  9: [37.5273, 127.0286], // 現代百貨店 狎鴎亭本店
  10: [37.4486, 126.4506], // 仁川空港 T1 出国エリア
  11: [36.3315, 127.4348], // KTX/大田駅
  12: [37.5663, 127.009], // 東大門ファッションビル
};

export function toiletCoord(tripId: string, rank: number): Coords | null {
  const c = tripId === "seoul-2026" ? SEOUL_BY_RANK[rank] : null;
  return c ? { lat: c[0], lon: c[1] } : null;
}

/** 現在地周辺のトイレを外部地図で探すURL（フォールバック）。 */
export function nearbyToiletMapUrl(c: Coords): string {
  return `https://www.google.com/maps/search/%ED%99%94%EC%9E%A5%EC%8B%A4/@${c.lat},${c.lon},16z`;
}
