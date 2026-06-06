export interface NavItem {
  href: string;
  label: string;
  emoji: string;
  desc: string;
}

export const navItems: NavItem[] = [
  { href: "/", label: "ホーム", emoji: "🏠", desc: "今やるべきこと" },
  { href: "/timeline", label: "行程", emoji: "🕐", desc: "並行タイムライン" },
  { href: "/phrases", label: "フレーズ", emoji: "💬", desc: "見せて使う韓国語" },
  { href: "/stores", label: "店ガイド", emoji: "📍", desc: "4店舗の注文・決済" },
  { href: "/payment", label: "決済", emoji: "💳", desc: "三本柱と現金残高" },
  { href: "/toilets", label: "トイレ", emoji: "🚻", desc: "きれいなトイレ順" },
  { href: "/checklist", label: "準備", emoji: "✅", desc: "出発前チェック" },
  { href: "/emergency", label: "緊急", emoji: "🆘", desc: "最終便と脱出プラン" },
];
