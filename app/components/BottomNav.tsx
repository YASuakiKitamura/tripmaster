"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useResolvedTrip } from "../lib/useResolvedTrip";

export function BottomNav() {
  const pathname = usePathname();
  const trip = useResolvedTrip();
  const navItems = trip.nav;
  // ログインと印刷プレビューでは下部ナビを出さない（紙面の邪魔になるため）
  if (pathname === "/login" || pathname === "/print") return null;
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--border)] bg-white/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]">
      <ul className="no-scrollbar mx-auto flex max-w-[680px] overflow-x-auto">
        {navItems.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <li key={item.href} className="min-w-[52px] flex-1">
              <Link
                href={item.href}
                className={`flex h-[64px] flex-col items-center justify-center gap-0.5 px-1 text-[10px] font-bold transition-colors ${
                  active ? "text-[var(--accent)]" : "text-[var(--text-sub)]"
                }`}
              >
                <span
                  className={`text-[20px] leading-none transition-transform ${
                    active ? "scale-110" : ""
                  }`}
                >
                  {item.emoji}
                </span>
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
