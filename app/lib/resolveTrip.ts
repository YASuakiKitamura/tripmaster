// 旅ごとに異なる JSON 構造（ソウル=海外便/フレーズ/入国、姫路=空路/宿/豆知識）を
// 共通の ResolvedTrip に正規化する。サーバー/クライアント両方から import 可能（純データ）。
import seoulRaw from "@/app/data/trips/seoul-2026.json";
import okinawaRaw from "@/app/data/trips/okinawa-2026.json";
import trip_himeji_okayama_renewRaw from "@/app/data/trips/himeji-okayama-renew.json";
// ADMIN:IMPORTS-END ▼ /admin が新しい国内旅の import をこの行の上に挿入します。残してください。
import type { TripData, ItineraryItem } from "./types";
import { getTrip, DEFAULT_TRIP_ID } from "./trips";
import { navItems, type NavItem } from "./nav";

const seoul = seoulRaw as unknown as SeoulData;

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
  extras: DomesticExtras;
}

/** 旅ごとに違う付帯情報。旅 JSON の `extras` キーに格納（resolveTrip では変換しない純データ）。 */
interface DomesticExtras {
  initialCash: number;
  reminders: string[];
  apps: HelpApp[];
  toilets: ToiletSpot[];
  weather: WeatherPoint[];
}

/** ソウル等の海外旅の付帯情報。現金は payment 側にあるため initialCash は持たない。 */
interface SeoulExtras {
  reminders: string[];
  apps: HelpApp[];
  bookings: { label: string; url: string; note?: string }[];
  toilets: ToiletSpot[];
  weather: WeatherPoint[];
}
interface SeoulData extends TripData {
  extras: SeoulExtras;
  lounge: {
    name: string;
    location: string;
    hours: string;
    access: Record<string, string>;
    services: string[];
    nearestGate: string;
    maxStayHours?: number;
  };
}

const okinawa = okinawaRaw as unknown as HimejiData;

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
  /** 出発前ラウンジ（あれば）。ホームにカード表示 */
  lounge?: {
    name: string;
    location: string;
    hours: string;
    access: { name: string; detail: string }[];
    services: string[];
    nearestGate: string;
    maxStayHours?: number;
  };
  tips?: { title: string; body: string }[];
  reminders: string[];
  apps: HelpApp[];
  /** 予約・公式リンク集（付録）。ホーム下部に直リンクで掲示 */
  bookings?: { label: string; url: string; note?: string }[];
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
    lounge: {
      ...t.lounge,
      access: Object.entries(t.lounge.access).map(([name, detail]) => ({
        name,
        detail,
      })),
    },
    reminders: seoul.extras.reminders,
    apps: seoul.extras.apps,
    bookings: seoul.extras.bookings,
    toilets: seoul.extras.toilets,
    weather: seoul.extras.weather,
    confirmList: [],
    hasPhrases: true,
    hasChecklist: true,
    nav: navItems,
  };
}

function resolveDomestic(t: HimejiData, id: string): ResolvedTrip {
  const x = t.extras;
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
    id,
    title: t.trip.title,
    dateLabel: dateLabel(id),
    summary: t.trip.summary,
    travelers: t.trip.travelers,
    legs: { outbound: leg(t.transport.outbound, "往路"), return: leg(r, "復路") },
    itinerary: t.itinerary,
    stores,
    payment: { strategy: p.strategy, methods, currency: "¥", initialCash: x.initialCash },
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
    reminders: x.reminders,
    apps: x.apps,
    toilets: x.toilets,
    weather: x.weather,
    confirmList: t._confirm ?? [],
    hasPhrases: false,
    hasChecklist: false,
    nav: navItems.filter(
      (n) => !["/phrases", "/checklist"].includes(n.href),
    ),
  };
}

// 国内旅レジストリ: 構造が同じ姫路型JSONを id で引く。新しい国内旅は
// JSON を import して1エントリ足すだけ（変換ロジックは触らない）。
const DOMESTIC: Record<string, HimejiData> = {
  "okinawa-2026": okinawa,
  "himeji-okayama-renew": trip_himeji_okayama_renewRaw as unknown as HimejiData,
  // ADMIN:DOMESTIC-END ▼ /admin が新しい国内旅のエントリをこの行の上に挿入します。残してください。
};

export function resolveTrip(id: string): ResolvedTrip {
  const domestic = DOMESTIC[id];
  if (domestic) return resolveDomestic(domestic, id);
  return resolveSeoul();
}

export { DEFAULT_TRIP_ID };
