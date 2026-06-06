// 旅ごとに異なる JSON 構造（ソウル=海外便/フレーズ/入国、姫路=空路/宿/豆知識）を
// 共通の ResolvedTrip に正規化する。サーバー/クライアント両方から import 可能（純データ）。
import seoulRaw from "@/app/data/trips/seoul-2026.json";
import himejiRaw from "@/app/data/trips/himeji-okayama-2026.json";
import type { TripData, ItineraryItem } from "./types";
import { getTrip, DEFAULT_TRIP_ID } from "./trips";
import { navItems, type NavItem } from "./nav";

const seoul = seoulRaw as unknown as TripData;

// ---- 姫路JSONの型（必要分のみ） ----
interface HStation { station: string; time: string; date: string }
interface HLeg {
  name: string;
  type: string;
  departure: HStation;
  arrival: HStation;
  seat?: string;
  isLast?: boolean;
  notes?: string;
}
interface HStore {
  id: string;
  name: string;
  reading: string;
  category: string;
  emoji: string;
  address?: string;
  nearStation?: string;
  hours?: string;
  closedDay?: string;
  rating?: number | null;
  payment?: string;
  budget?: string;
  signatureDish?: string;
  orderTip?: string;
  notes?: string;
  mapQuery: string;
}
interface HimejiData {
  trip: {
    title: string;
    travelers: { name: string; note?: string }[];
    summary?: string;
  };
  transport: { outbound: HLeg; return: HLeg };
  lodging?: {
    name: string;
    area: string;
    checkIn: string;
    checkOut: string;
    notes?: string;
  };
  itinerary: ItineraryItem[];
  stores: HStore[];
  _confirm?: string[];
  payment: {
    strategy: string;
    ic: { role: string; note?: string };
    card: { role: string; note?: string };
    cash: { role: string; note?: string };
  };
  emergency: {
    safetyNets: string[];
    ifMissed: { plan: string };
    contacts: { label: string; value: string }[];
    lastTrain?: { name: string; departure: string; note?: string };
  };
  tips?: { title: string; body: string }[];
}
const himeji = himejiRaw as unknown as HimejiData;

// ---- 正規化後の型 ----
export interface Leg {
  emoji: string;
  kind: string;
  name: string;
  fareClass?: string;
  fromLabel: string;
  fromTime: string;
  toLabel: string;
  toTime: string;
  nextDay?: boolean;
  isLast?: boolean;
  seatInfo?: string;
  notes?: string;
}
export interface StoreHighlight {
  label?: string;
  primary: string;
  sub?: string;
  script?: boolean; // primary を大きな外国語フォントで表示するか
}
export interface ResolvedStore {
  id: string;
  name: string;
  nameSub?: string;
  reading: string;
  category: string;
  emoji: string;
  address?: string;
  nearStation?: string;
  hours?: string;
  closedDay?: string;
  rating?: number | null;
  ratingCount?: number;
  badge?: string;
  payment?: string;
  budget?: string;
  notes?: string;
  mapQuery: string;
  highlights: StoreHighlight[];
}
export interface PayMethod {
  emoji: string;
  name: string;
  role: string;
  note?: string;
  badge?: string;
  balances?: { name: string; amount: number }[];
}
export interface EmergencySection {
  title: string;
  lines: string[];
}
export interface HelpApp {
  label: string;
  emoji: string;
  url: string;
  note?: string;
}
export interface ToiletNear {
  spot: string; // 観光名所
  walk: string; // そこからの距離（徒歩目安）
}
export interface ToiletSpot {
  rank: number;
  name: string;
  area: string;
  clean: string; // 清潔度の目安（★など）
  tip?: string;
  near: ToiletNear[];
}
export interface WeatherPoint {
  label: string;
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD
}
export interface ResolvedTrip {
  id: string;
  title: string;
  dateLabel: string;
  summary?: string;
  travelers: { name: string; note?: string }[];
  legs: { outbound: Leg; return: Leg };
  itinerary: ItineraryItem[];
  stores: ResolvedStore[];
  payment: {
    strategy: string;
    methods: PayMethod[];
    currency: string;
    initialCash: number;
  };
  emergency: {
    warning: { title: string; note: string };
    safetyNets: string[];
    ifMissed: string;
    sections: EmergencySection[];
  };
  lodging?: {
    name: string;
    area: string;
    checkIn: string;
    checkOut: string;
    notes?: string;
  };
  tips?: { title: string; body: string }[];
  reminders: string[];
  apps: HelpApp[];
  toilets: ToiletSpot[];
  weather: WeatherPoint[];
  confirmList: string[];
  hasPhrases: boolean;
  hasChecklist: boolean;
  nav: NavItem[];
}

function dateLabel(id: string): string {
  return getTrip(id)?.dateLabel ?? "";
}

function resolveSeoul(): ResolvedTrip {
  const t = seoul;
  const seats = `靖晃${t.trip.travelers[0].seat} / ひとみ${t.trip.travelers[1].seat}`;
  const o = t.flights.outbound;
  const r = t.flights.return;
  const leg = (f: typeof o, kind: string, isLast?: boolean): Leg => ({
    emoji: "✈️",
    kind,
    name: f.flight,
    fareClass: f.fareClass,
    fromLabel: f.departure.airport,
    fromTime: f.departure.time,
    toLabel: f.arrival.airport,
    toTime: f.arrival.time,
    nextDay: f.arrival.nextDay,
    isLast,
    seatInfo: seats,
  });

  const stores: ResolvedStore[] = t.stores.map((s) => {
    const highlights: StoreHighlight[] = [
      {
        label: "注文セリフ",
        primary: s.orderScript,
        sub: `${s.orderReading}\n${s.orderMeaning}`,
        script: true,
      },
    ];
    if (s.extraOrder)
      highlights.push({
        label: "追加（任意）",
        primary: s.extraOrder.script,
        sub: `${s.extraOrder.reading}\n${s.extraOrder.meaning}`,
        script: true,
      });
    s.extras?.forEach((ex) =>
      highlights.push({
        label: "追加・調整",
        primary: ex.script,
        sub: `${ex.reading}\n${ex.meaning}`,
        script: true,
      }),
    );
    return {
      id: s.id,
      name: s.name,
      nameSub: s.nameJa,
      reading: s.reading,
      category: s.category,
      emoji: s.emoji,
      address: s.address,
      nearStation: s.nearStation,
      hours: s.hours,
      closedDay: s.closedDay,
      rating: s.rating,
      ratingCount: s.ratingCount,
      badge: s.michelin ? `ミシュラン ${s.michelin}` : undefined,
      payment: s.payment,
      budget: s.budget,
      notes: s.notes,
      mapQuery: `${s.nameKo ?? s.name} ${s.address ?? ""} 서울`,
      highlights,
    };
  });

  const p = t.payment;
  const methods: PayMethod[] = [
    {
      emoji: "🚇",
      name: "T-money",
      role: p.tmoney.role,
      badge: "チャージ済",
      balances: Object.entries(p.tmoney.balance).map(([name, amount]) => ({
        name,
        amount: amount as number,
      })),
    },
    { emoji: "💳", name: "Mastercard", role: p.mastercard.role, note: p.mastercard.notes },
    {
      emoji: "💴",
      name: "現金",
      role: p.cash.role,
      note: `両替済 ₩${p.cash.exchanged.toLocaleString()}（${p.cash.denomination}）。${p.cash.daejeonCashingPlan}`,
    },
    {
      emoji: "🎫",
      name: "WOWPASS",
      role: p.wowpass.strategy,
      badge: "現金化一択",
      note: `残高₩${p.wowpass.balance.toLocaleString()}→回収₩${p.wowpass.cashoutAmount.toLocaleString()}（手数料₩${p.wowpass.fee.toLocaleString()}）。${p.wowpass.cashoutLocation}（仁川では出金不可）`,
    },
  ];

  const e = t.emergency;
  return {
    id: "seoul-2026",
    title: t.trip.title,
    dateLabel: dateLabel("seoul-2026"),
    travelers: t.trip.travelers.map((tr) => ({ name: tr.name, note: tr.seat })),
    legs: { outbound: leg(o, "往路"), return: leg(r, "復路", true) },
    itinerary: t.itinerary,
    stores,
    payment: { strategy: p.strategy, methods, currency: "₩", initialCash: p.cash.exchanged },
    emergency: {
      warning: {
        title: `${r.flight} は最終便（${r.departure.time}発・後がない）`,
        note: `乗り遅れるとその日は帰れません。ピーチ締切は出発${r.peachDeadlineMinutes}分前(21:45)。19:36のAREX直通で必ず間に合わせる。`,
      },
      safetyNets: e.safetyNets,
      ifMissed: `その夜: ${e.ifMissed.sameNight}`,
      sections: [
        {
          title: "翌朝の脱出プラン（推奨）",
          lines: [
            e.ifMissed.nextMorning.recommended,
            `就航: ${e.ifMissed.nextMorning.airlines}`,
            e.ifMissed.nextMorning.note,
          ],
        },
        {
          title: `ナガスパ案（${e.ifMissed.nagaspa.label}）`,
          lines: [
            e.ifMissed.nagaspa.route,
            `費用: ${e.ifMissed.nagaspa.cost}`,
            e.ifMissed.nagaspa.note,
          ],
        },
        {
          title: "鉄道の信頼性",
          lines: [e.railReliability.summary, ...e.railReliability.reasons],
        },
        {
          title: "入国・SES登録",
          lines: [
            `初回は有人ゲート。打診: ${t.immigration.ses.registrationPhrase}`,
            `登録センター: ${t.immigration.ses.centerHours}`,
          ],
        },
      ],
    },
    reminders: [
      "e-Arrival Card を出発前にオンライン申請（2026年から紙廃止）",
      "復路 MM808 は最終便（22:35発・後がない）。ピーチ締切は出発50分前",
      "カードは必ずウォン建て決済（DCC回避で3-5%節約）",
      "WOWPASS は夜ソウル駅で現金化一択",
    ],
    apps: [
      { label: "NAVER Map", emoji: "🗺", url: "https://map.naver.com/", note: "韓国はGoogleマップが弱い。ナビはこれ" },
      { label: "KakaoMap", emoji: "🧭", url: "https://map.kakao.com/", note: "もう一つの定番地図" },
      { label: "Papago", emoji: "🗣", url: "https://papago.naver.com/", note: "韓国語に強い翻訳・カメラ翻訳" },
      { label: "Google翻訳", emoji: "🌐", url: "https://translate.google.com/?sl=ja&tl=ko&op=translate" },
      { label: "ソウル天気", emoji: "☀️", url: "https://www.google.com/search?q=서울+날씨" },
      { label: "為替(₩→¥)", emoji: "💱", url: "https://www.google.com/search?q=1000+won+to+jpy" },
    ],
    toilets: [
      {
        rank: 1,
        name: "ロッテ百貨店 本店",
        area: "明洞・乙支路入口（乙支路入口駅 直結）",
        clean: "★★★ 最上級（デパート品質）",
        tip: "明洞での駆け込みはここが鉄板。化粧室が広く混雑にも強い。",
        near: [
          { spot: "瑞源/明洞（朝食）", walk: "徒歩5分" },
          { spot: "明洞ショッピング", walk: "徒歩3〜5分" },
        ],
      },
      {
        rank: 2,
        name: "仁川空港 第1ターミナル",
        area: "仁川空港 T1",
        clean: "★★★ 世界トップクラス",
        tip: "復路チェックイン前後に。個室・パウダー充実。",
        near: [
          { spot: "復路チェックイン", walk: "館内すぐ" },
          { spot: "AREX 仁川到着", walk: "連絡通路すぐ" },
        ],
      },
      {
        rank: 3,
        name: "ソウル駅 構内",
        area: "ソウル駅（AREX/KTX）",
        clean: "★★★ 清潔・数も多い",
        tip: "朝の到着時と、夜のWOWPASS現金化のタイミングで使える。",
        near: [
          { spot: "AREXソウル駅着（朝）", walk: "改札内すぐ" },
          { spot: "WOWPASS現金化（夜）", walk: "同フロア" },
        ],
      },
      {
        rank: 4,
        name: "斗山타워 / 現代アウトレット 東大門",
        area: "東大門（DDP周辺）",
        clean: "★★☆ 商業施設で安定",
        tip: "ナッコプセや東大門の買い物の合間に。",
        near: [
          { spot: "용호동낙지（夕食）", walk: "徒歩5分" },
          { spot: "東大門・DDP", walk: "徒歩3〜5分" },
        ],
      },
      {
        rank: 5,
        name: "広蔵市場 周辺の建物・カフェ",
        area: "鍾路5街（広蔵市場）",
        clean: "★☆☆ 市場内トイレは衛生面△",
        tip: "市場内は混雑＆簡素。隣接ビルやスタバ等のカフェ利用が無難。",
        near: [
          { spot: "부촌육회（広蔵市場）", walk: "市場内〜徒歩3分" },
          { spot: "鍾路5街駅", walk: "徒歩2分" },
        ],
      },
      {
        rank: 6,
        name: "大田駅 構内（靖晃）",
        area: "大田駅（KTX）",
        clean: "★★☆ 駅構内で清潔",
        tip: "靖晃の大田パート。ATMキャッシングや食堂の前後に。",
        near: [
          { spot: "광천식당（大田）", walk: "駅から徒歩圏" },
          { spot: "성심당", walk: "駅周辺" },
        ],
      },
    ],
    weather: [
      { label: "ソウル", lat: 37.5665, lon: 126.978, date: "2026-06-17" },
    ],
    confirmList: [],
    hasPhrases: true,
    hasChecklist: true,
    nav: navItems,
  };
}

function resolveHimeji(): ResolvedTrip {
  const t = himeji;
  const legEmoji = (type: string) => (type === "新幹線" ? "🚄" : "✈️");
  const leg = (f: HLeg, kind: string): Leg => ({
    emoji: legEmoji(f.type),
    kind,
    name: f.name,
    fromLabel: f.departure.station,
    fromTime: f.departure.time,
    toLabel: f.arrival.station,
    toTime: f.arrival.time,
    isLast: f.isLast,
    seatInfo: f.seat || undefined,
    notes: f.notes,
  });

  const stores: ResolvedStore[] = t.stores.map((s) => {
    const highlights: StoreHighlight[] = [];
    if (s.signatureDish)
      highlights.push({
        label: "名物・おすすめ",
        primary: s.signatureDish,
        sub: s.orderTip,
      });
    return {
      id: s.id,
      name: s.name,
      reading: s.reading,
      category: s.category,
      emoji: s.emoji,
      address: s.address,
      nearStation: s.nearStation,
      hours: s.hours,
      closedDay: s.closedDay,
      rating: s.rating ?? null,
      payment: s.payment || undefined,
      budget: s.budget,
      notes: s.notes,
      mapQuery: s.mapQuery,
      highlights,
    };
  });

  const p = t.payment;
  const methods: PayMethod[] = [
    { emoji: "🚃", name: "ICカード(ICOCA)", role: p.ic.role, note: p.ic.note },
    { emoji: "💳", name: "クレジットカード", role: p.card.role, note: p.card.note },
    { emoji: "💴", name: "現金", role: p.cash.role, note: p.cash.note },
  ];

  const e = t.emergency;
  const r = t.transport.return;
  return {
    id: "himeji-okayama-2026",
    title: t.trip.title,
    dateLabel: dateLabel("himeji-okayama-2026"),
    summary: t.trip.summary,
    travelers: t.trip.travelers,
    legs: { outbound: leg(t.transport.outbound, "往路"), return: leg(r, "復路") },
    itinerary: t.itinerary,
    stores,
    payment: { strategy: p.strategy, methods, currency: "¥", initialCash: 20000 },
    emergency: {
      warning: {
        title: `復路 ${r.name}（${r.departure.time} ${r.departure.station}発）`,
        note: r.notes ?? e.lastTrain?.note ?? "",
      },
      safetyNets: e.safetyNets,
      ifMissed: e.ifMissed.plan,
      sections: [
        { title: "連絡先", lines: e.contacts.map((c) => `${c.label}: ${c.value}`) },
      ],
    },
    lodging: t.lodging,
    tips: t.tips,
    reminders: [
      "復路 ANA658（17:20 岡山発）に乗り遅れない。後続便・新幹線が保険",
      "羽田P駐車場はオンライン事前予約必須",
      "猛暑期：帽子・水分・冷感タオルを徹底",
      "福寿司は要予約。宿チェックインは19:00開始",
    ],
    apps: [
      { label: "Googleマップ", emoji: "🗺", url: "https://www.google.com/maps", note: "ナビ・店検索" },
      { label: "Yahoo!乗換案内", emoji: "🚆", url: "https://transit.yahoo.co.jp/", note: "JR・新幹線の時刻/乗換" },
      { label: "岡山の天気", emoji: "☀️", url: "https://www.google.com/search?q=岡山+天気" },
      { label: "姫路の天気", emoji: "🌤", url: "https://www.google.com/search?q=姫路+天気" },
      { label: "ANA運航案内", emoji: "✈️", url: "https://www.ana.co.jp/fl/ja/jp/" },
      { label: "食べログ", emoji: "🍴", url: "https://tabelog.com/okayama/" },
    ],
    toilets: [
      {
        rank: 1,
        name: "岡山駅 さんすて／駅構内",
        area: "JR岡山駅",
        clean: "★★★ 広く清潔・数も多い",
        tip: "ホテル・後楽園・表町・空港バスの起点。困ったらここ。",
        near: [
          { spot: "スーパーホテル（宿）", walk: "徒歩10分" },
          { spot: "表町商店街", walk: "徒歩10〜15分" },
          { spot: "岡山空港バス乗り場", walk: "西口すぐ" },
        ],
      },
      {
        rank: 2,
        name: "姫路城・好古園（入城口・園内）",
        area: "姫路城エリア",
        clean: "★★★ 観光整備できれい",
        tip: "猛暑日は入城前に済ませると安心。城内は階段が多く戻りにくい。",
        near: [
          { spot: "姫路城・好古園", walk: "敷地内すぐ" },
          { spot: "姫路駅", walk: "徒歩15分（大手前通り）" },
        ],
      },
      {
        rank: 3,
        name: "姫路駅 ピオレ／駅構内",
        area: "JR姫路駅",
        clean: "★★★ 駅ビルで清潔",
        tip: "城へ向かう前後に。新幹線移動時もここで。",
        near: [
          { spot: "姫路城", walk: "徒歩15分" },
          { spot: "のぞみ乗車（岡山へ）", walk: "改札内すぐ" },
        ],
      },
      {
        rank: 4,
        name: "神戸空港 ターミナル",
        area: "神戸空港",
        clean: "★★★ 新しく清潔",
        tip: "到着直後に。ポートライナー乗車前に済ませると三宮で慌てない。",
        near: [
          { spot: "ANA411 到着", walk: "館内すぐ" },
          { spot: "ポートライナー乗り場", walk: "連絡通路すぐ" },
        ],
      },
      {
        rank: 5,
        name: "後楽園（園内・正門）",
        area: "岡山後楽園",
        clean: "★★☆ 園内に複数あり",
        tip: "日陰が少ないので休憩とセットで。岡山城へ渡る前に。",
        near: [
          { spot: "岡山後楽園", walk: "園内すぐ" },
          { spot: "岡山城（烏城）", walk: "徒歩5分（月見橋）" },
        ],
      },
      {
        rank: 6,
        name: "明石駅 アスピア明石／駅ビル",
        area: "明石（魚の棚周辺）",
        clean: "★★☆ 駅ビルで安定",
        tip: "魚の棚・明石焼きの前後に。市場内は簡素なので駅ビル推奨。",
        near: [
          { spot: "たこ磯（明石焼き）", walk: "徒歩3分" },
          { spot: "魚の棚商店街", walk: "徒歩2分" },
        ],
      },
      {
        rank: 7,
        name: "三宮 そごう／さんちか地下街",
        area: "三宮",
        clean: "★★☆ 百貨店・地下街で清潔",
        tip: "三宮街歩きの合間に。百貨店トイレが快適。",
        near: [{ spot: "三宮街歩き", walk: "徒歩すぐ〜5分" }],
      },
    ],
    weather: [
      { label: "姫路", lat: 34.8394, lon: 134.6939, date: "2026-07-29" },
      { label: "岡山", lat: 34.6551, lon: 133.9195, date: "2026-07-30" },
    ],
    confirmList: t._confirm ?? [],
    hasPhrases: false,
    hasChecklist: false,
    nav: navItems.filter(
      (n) => !["/phrases", "/checklist"].includes(n.href),
    ),
  };
}

export function resolveTrip(id: string): ResolvedTrip {
  if (id === "himeji-okayama-2026") return resolveHimeji();
  return resolveSeoul();
}

export { DEFAULT_TRIP_ID };
