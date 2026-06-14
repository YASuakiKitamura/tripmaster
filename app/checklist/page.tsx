"use client";

import { useEffect, useState } from "react";
import { useResolvedTrip } from "../lib/useResolvedTrip";
import { PageTitle } from "../components/ui";

interface CheckItem {
  id: string;
  label: string;
  detail?: string;
}
interface CheckGroup {
  title: string;
  emoji: string;
  items: CheckItem[];
}

const GROUPS: CheckGroup[] = [
  {
    title: "出発前の必須申請",
    emoji: "🛂",
    items: [
      {
        id: "earrival",
        label: "e-Arrival Card をオンライン申請",
        detail: "2026年から紙廃止。夫婦2人分。出発前必須。",
      },
      { id: "keta", label: "K-ETA 免除を確認", detail: "2026年12月末まで免除。" },
      {
        id: "peach-checkin",
        label: "ピーチのオンラインチェックイン確認",
        detail: "復路は締切が出発50分前と厳しめ。",
      },
    ],
  },
  {
    title: "決済の準備",
    emoji: "💳",
    items: [
      { id: "exchange", label: "現金 ₩80,000 両替済み", detail: "大黒屋で両替済み。" },
      {
        id: "tmoney",
        label: "T-money チャージ済み",
        detail: "靖晃 ₩15,000 / ひとみ ₩12,000。",
      },
      { id: "mastercard", label: "Mastercard を携帯", detail: "DCC回避＝ウォン建てで。" },
      { id: "wowpass", label: "WOWPASS 残高を確認", detail: "夜ソウル駅で現金化一択。" },
    ],
  },
  {
    title: "持ち物",
    emoji: "🎒",
    items: [
      { id: "passport", label: "パスポート（夫婦2人分）" },
      { id: "battery", label: "モバイルバッテリー", detail: "保安検査では手荷物に。" },
      { id: "sim", label: "通信（au海外放題 / 楽天ローミング）" },
      { id: "sleep", label: "機内仮眠グッズ", detail: "アイマスク・ネックピロー・耳栓。" },
      { id: "baggage", label: "受託手荷物は復路の靖晃のみ×1", detail: "ひとみは全て手荷物。" },
    ],
  },
  {
    title: "当日朝（出発前）",
    emoji: "🚗",
    items: [
      { id: "gas", label: "ガソリン満タン・P5駐車場へ" },
      { id: "snack", label: "羽田 Air LAWSON で機内軽食を調達" },
      { id: "vouchers", label: "AREX・KTX のバウチャーQRを準備" },
    ],
  },
];

const ALL_IDS = GROUPS.flatMap((g) => g.items.map((i) => i.id));
const STORAGE_KEY = "seoul2026-checklist";

export default function ChecklistPage() {
  const trip = useResolvedTrip();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setChecked(JSON.parse(saved));
    } catch {
      /* ignore */
    }
    setLoaded(true);
  }, []);

  const toggle = (id: string) => {
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const done = ALL_IDS.filter((id) => checked[id]).length;
  const pct = Math.round((done / ALL_IDS.length) * 100);

  if (!trip.hasChecklist) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center px-6 text-center">
        <div className="text-[40px]">✅</div>
        <p className="mt-3 text-[14px] font-bold text-[var(--text-sub)]">
          この旅の準備リストは未設定です
        </p>
      </div>
    );
  }

  return (
    <div className="px-4 pb-8 pt-5">
      <PageTitle
        emoji="✅"
        title="準備チェックリスト"
        desc="チェック状態はこの端末に保存されます。"
      />

      {/* 進捗バー */}
      <div className="mt-3 rounded-[12px] border border-[var(--border)] bg-white p-3 shadow-[var(--shadow)]">
        <div className="flex items-center justify-between text-[12px] font-bold">
          <span className="text-[var(--text-sub)]">完了</span>
          <span className="text-[var(--accent)] tabular-nums">
            {done} / {ALL_IDS.length}（{loaded ? pct : 0}%）
          </span>
        </div>
        <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--bg)]">
          <div
            className="h-full rounded-full bg-[var(--accent)] transition-all duration-300"
            style={{ width: `${loaded ? pct : 0}%` }}
          />
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-1.5 text-[13px] font-bold text-[var(--text-sub)]">
              {g.emoji} {g.title}
            </h3>
            <div className="overflow-hidden rounded-[12px] border border-[var(--border)] bg-white shadow-[var(--shadow)]">
              {g.items.map((item) => {
                const on = !!checked[item.id];
                return (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="flex w-full items-start gap-3 border-b border-[var(--border)] p-3 text-left last:border-0 active:bg-[var(--bg)]"
                  >
                    <span
                      className={`mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[6px] border-2 text-[12px] font-bold transition-colors ${
                        on
                          ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                          : "border-[var(--border)] text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                    <span className="flex-1">
                      <span
                        className={`block text-[14px] font-bold ${
                          on
                            ? "text-[var(--text-sub)] line-through"
                            : "text-[var(--text)]"
                        }`}
                      >
                        {item.label}
                      </span>
                      {item.detail && (
                        <span className="mt-0.5 block text-[11px] text-[var(--text-sub)]">
                          {item.detail}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
