// 行程の各項目（itinerary id）→ 目的地の地図検索クエリ＋任意の関連情報リンク。
// 主要な目的地のみ定義。未定義の項目（移動・空港手続き等）はリンクを出さない。

export interface PlaceLink {
  q: string; // 地図検索クエリ
  jp?: boolean; // ソウル旅でも日本国内の地点（羽田等）→ Googleマップを使う
  info?: { label: string; url: string }; // 公式サイト等の関連情報
}

const SEOUL: Record<string, PlaceLink> = {
  "arrive-icn": { q: "인천국제공항 제1여객터미널", info: { label: "仁川空港 公式", url: "https://www.airport.kr/ap_lp/ja/index.do" } },
  "arex-inbound": { q: "서울역", info: { label: "AREX 予約・チケット", url: "https://www.airportrailroad.com/ticket/info" } },
  breakfast: { q: "서원죽 명동" },
  "hitomi-to-apgujeong": { q: "도산공원 압구정" },
  "daejeon-atm-food": { q: "광천식당 대전" },
  goshen: { q: "고센 도산공원" },
  seongsim: { q: "성심당 본점 대전" },
  meetup: { q: "명동역" },
  "myeongdong-shopping": { q: "명동" },
  "buchon-yukhoe": { q: "부촌육회 광장시장" },
  dongdaemun: { q: "동대문디자인플라자 DDP" },
  nakkopsae: { q: "용호동낙지 동대문" },
  "move-to-station": { q: "서울역" },
  "arex-return": { q: "인천국제공항 제1여객터미널", info: { label: "AREX 予約・チケット", url: "https://www.airportrailroad.com/ticket/info" } },
  "wowpass-cashout": { q: "서울역" },
  "checkin-return": { q: "인천국제공항 제1여객터미널" },
  // 日本国内の地点は Googleマップ
  "arrive-haneda": { q: "羽田空港 第3ターミナル", jp: true },
};

const HIMEJI: Record<string, PlaceLink> = {
  "day1-flight-out": { q: "神戸空港" },
  "day1-portliner": { q: "三宮駅" },
  "day1-sannomiya-walk": { q: "神戸 三宮" },
  "day1-akashiyaki": { q: "たこ磯 明石 魚の棚" },
  "day1-uonotana": { q: "魚の棚商店街 明石" },
  "day1-himeji-castle": {
    q: "姫路城",
    info: { label: "姫路城 公式", url: "https://www.himejicastle.jp/" },
  },
  "day1-hotel-dropoff": { q: "スーパーホテル岡山駅東口" },
  "day1-dinner": { q: "福寿司 岡山駅" },
  "day2-korakuen": {
    q: "岡山後楽園",
    info: { label: "後楽園 公式", url: "https://okayama-korakuen.jp/" },
  },
  "day2-okayama-castle": { q: "岡山城" },
  "day2-lunch": { q: "てっぱん家 青山 岡山" },
  "day2-omotecho": { q: "表町商店街 岡山" },
  "day2-airport-bus": { q: "岡山空港" },
  "day2-airport-checkin": { q: "岡山空港" },
};

const OKINAWA: Record<string, PlaceLink> = {
  "day1-flight-out": { q: "那覇空港" },
  "day1-arrive-naha": { q: "那覇空港" },
  "day1-hotel-dropoff": { q: "ホテル ストレータ那覇 牧志" },
  "day1-checkin": { q: "ホテル ストレータ那覇 牧志" },
  "day3-checkout-depart": { q: "ホテル ストレータ那覇 牧志" },
  "day1-shurijo": {
    q: "首里城公園",
    info: { label: "首里城公園 公式", url: "https://oki-park.jp/shurijo/" },
  },
  "day1-lunch-suri-soba": { q: "首里そば 那覇" },
  "day1-kokusai-dinner": { q: "牧志公設市場 那覇" },
  "day2-churaumi": {
    q: "沖縄美ら海水族館",
    info: { label: "美ら海水族館 公式", url: "https://churaumi.okinawa/" },
  },
  "day2-lunch-motobu": { q: "きしもと食堂 本部" },
  "day2-kouri-fukugi": { q: "古宇利島" },
  "day3-kadena-burger": { q: "Bob's バーガー 嘉手納" },
  "day3-kaichu-uruma": { q: "海中道路 うるま" },
  "day3-sams-steak": { q: "サムズ ステーキ 沖縄" },
  "day1-rentacar-shuttle": { q: "ABCレンタカー 那覇空港営業所 那覇市田原" },
  "day1-rentacar-pickup": { q: "ABCレンタカー 那覇空港営業所 那覇市田原" },
  "day3-rentacar-return": { q: "ABCレンタカー 那覇空港営業所 那覇市田原" },
  "day3-checkin-airport": { q: "那覇空港" },
  "day3-flight-back": { q: "那覇空港" },
};

export function getPlaceLink(tripId: string, itemId: string): PlaceLink | null {
  const table =
    tripId === "seoul-2026"
      ? SEOUL
      : tripId === "okinawa-2026"
        ? OKINAWA
        : HIMEJI;
  return table[itemId] ?? null;
}

/** 地図URLを組み立てる。ソウル＝NAVER Map、国内（jpフラグ含む）＝Googleマップ */
export function mapUrl(tripId: string, link: PlaceLink): string {
  const useNaver = tripId === "seoul-2026" && !link.jp;
  const q = encodeURIComponent(link.q);
  return useNaver
    ? `https://map.naver.com/p/search/${q}`
    : `https://www.google.com/maps/search/?api=1&query=${q}`;
}
