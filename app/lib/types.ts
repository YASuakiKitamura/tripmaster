// 旅程データの型定義（trip-data.json に対応）

export type Who = "夫婦" | "靖晃" | "ひとみ";

export interface Traveler {
  name: string;
  nameKo: string;
  email: string;
  seat: string;
}

export interface FlightEndpoint {
  airport: string;
  time: string;
  timezone: string;
  nextDay?: boolean;
}

export interface Flight {
  flight: string;
  aircraft: string;
  fareClass: string;
  departure: FlightEndpoint;
  arrival: FlightEndpoint;
  checkedBaggage: Record<string, boolean>;
  isLastFlight?: boolean;
  peachDeadlineMinutes?: number;
}

export interface ItineraryItem {
  id: string;
  time: { start: string; end: string; tz: string; date?: string };
  who: Who;
  emoji: string;
  title: string;
  notes: string;
}

export interface OrderLine {
  script: string;
  reading: string;
  meaning: string;
}

export interface Store {
  id: string;
  name: string;
  nameJa?: string;
  nameKo?: string;
  reading: string;
  category: string;
  emoji: string;
  address?: string;
  nearStation?: string;
  hours?: string;
  closedDay?: string;
  rating?: number;
  ratingCount?: number;
  michelin?: string;
  payment: string;
  budget?: string;
  orderScript: string;
  orderReading: string;
  orderMeaning: string;
  notes: string;
  extraOrder?: OrderLine;
  extras?: OrderLine[];
}

export interface TripData {
  trip: {
    title: string;
    date: string;
    dayOfWeek: string;
    travelers: Traveler[];
  };
  flights: { outbound: Flight; return: Flight };
  itinerary: ItineraryItem[];
  stores: Store[];
  payment: {
    strategy: string;
    tmoney: { role: string; balance: Record<string, number>; preCharged: boolean };
    mastercard: { role: string; notes: string };
    cash: {
      role: string;
      exchanged: number;
      denomination: string;
      daejeonCashingPlan: string;
    };
    wowpass: {
      balance: number;
      strategy: string;
      cashoutLocation: string;
      cashoutAmount: number;
      fee: number;
    };
  };
  emergency: {
    mm808IsLastFlight: boolean;
    safetyNets: string[];
    ifMissed: {
      sameNight: string;
      nextMorning: { recommended: string; note: string; airlines: string };
      nagaspa: { label: string; route: string; cost: string; note: string };
    };
    railReliability: { summary: string; reasons: string[] };
  };
  immigration: {
    eArrivalCard: { required: boolean; note: string };
    keta: { required: boolean; note: string };
    ses: { firstTimeProcess: string; registrationPhrase: string; centerHours: string };
  };
  communication: Record<string, { cost: number; data: string; note: string }>;
}

// 会話フレーズ
export interface Phrase {
  situation?: string;
  korean: string;
  reading: string;
  meaning: string;
  note?: string;
  tags?: { label: string; color: "blue" | "green" | "orange" | "purple" }[];
  big?: boolean; // 店員に見せる大型表示
}

export interface PhraseCategory {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  phrases: Phrase[];
}
