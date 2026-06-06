import rawTripData from "@/app/data/trips/seoul-2026.json";
import type { TripData, ItineraryItem } from "./types";

// 現在アクティブな旅のデータ。今のところソウル固定。
// 将来は trips レジストリ（lib/trips.ts）から id ごとに読み込めるようにする。
export const tripData = rawTripData as unknown as TripData;

export type Perspective = "混合" | "夫婦＋靖晃" | "夫婦＋ひとみ";
export const PERSPECTIVES: Perspective[] = ["混合", "夫婦＋靖晃", "夫婦＋ひとみ"];

/**
 * パースペクティブで旅程を絞り込む。
 * 「混合」は全件。各人ビューは「夫婦の共同予定＋その人の単独予定」を表示。
 */
export function filterByPerspective(
  items: ItineraryItem[],
  p: Perspective,
): ItineraryItem[] {
  if (p === "夫婦＋靖晃")
    return items.filter((it) => it.who === "夫婦" || it.who === "靖晃");
  if (p === "夫婦＋ひとみ")
    return items.filter((it) => it.who === "夫婦" || it.who === "ひとみ");
  return items; // 混合
}

export const WHO_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  夫婦: { bg: "bg-[var(--accent-light)]", text: "text-[var(--accent-dark)]", dot: "bg-[var(--accent)]" },
  靖晃: { bg: "bg-[var(--tag-blue-bg)]", text: "text-[var(--tag-blue)]", dot: "bg-[var(--tag-blue)]" },
  ひとみ: { bg: "bg-[var(--tag-purple-bg)]", text: "text-[var(--tag-purple)]", dot: "bg-[var(--tag-purple)]" },
};

/**
 * 旅程上の日時を「日本標準時の絶対時刻(ms)」に変換する。
 * tz が Asia/Seoul の場合、韓国時刻(UTC+9)と日本時刻(UTC+9)は同一オフセットなので
 * 壁時計の比較として JST 基準に正規化して扱う。
 * date が無い項目は当日(2026-06-17)とみなす。
 */
export function itineraryStartMs(item: ItineraryItem): number {
  const date = item.time.date ?? "2026-06-17";
  const [h, m] = item.time.start.split(":").map(Number);
  // KST と JST は同じ UTC+9。壁時計をそのまま JST の Date として生成する。
  const [y, mo, d] = date.split("-").map(Number);
  return Date.UTC(y, mo - 1, d, h - 9, m); // UTC+9 の壁時計 → UTC ms
}

export function itineraryEndMs(item: ItineraryItem): number {
  const date = item.time.date ?? "2026-06-17";
  let [h, m] = item.time.end.split(":").map(Number);
  const [sh] = item.time.start.split(":").map(Number);
  // 終了が開始より小さい場合は日跨ぎ
  let dayOffset = 0;
  if (h < sh) dayOffset = 1;
  const [y, mo, d] = date.split("-").map(Number);
  return Date.UTC(y, mo - 1, d + dayOffset, h - 9, m);
}
