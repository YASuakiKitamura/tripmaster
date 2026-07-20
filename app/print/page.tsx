"use client";

// 紙の旅程表（かつての旅行会社が渡してくれたあの1枚）。
// 画面ではプレビュー、印刷すると A4 に収まる白黒基調のレイアウトになる。
// 当日ライブ編集した内容も載るよう、ベースではなく useItinerary 経由の行程を使う。

import { useResolvedTrip } from "../lib/useResolvedTrip";
import { useItinerary } from "../lib/useItinerary";
import { itineraryStartMs } from "../lib/data";
import { seoulDateString } from "../lib/useNow";
import type { ItineraryItem } from "../lib/types";
import type { Leg } from "../lib/resolveTrip";

/**
 * 行程を日付ごとにまとめる。ソウルのような深夜出発の旅は date 未設定の項目が
 * あるため、タイムラインと同じ itineraryStartMs で実際の日付に解決してから束ねる
 * （素の time.date で束ねると、日付なしの当日分が前夜より前に並んでしまう）。
 */
function groupByDate(items: ItineraryItem[]): [string, ItineraryItem[]][] {
  const map = new Map<string, ItineraryItem[]>();
  for (const it of items) {
    const key = seoulDateString(itineraryStartMs(it));
    const list = map.get(key);
    if (list) list.push(it);
    else map.set(key, [it]);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
}

const WEEK = ["日", "月", "火", "水", "木", "金", "土"];

function formatDate(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const w = WEEK[new Date(y, m - 1, d).getDay()];
  return `${y}年${m}月${d}日（${w}）`;
}

function LegRow({ label, leg }: { label: string; leg: Leg }) {
  return (
    <tr>
      <th scope="row">{label}</th>
      <td>
        <b>{leg.name}</b>
        {leg.fareClass ? `（${leg.fareClass}）` : ""}
        <br />
        {leg.fromLabel} {leg.fromTime} → {leg.toLabel} {leg.toTime}
        {leg.nextDay ? "（翌日着）" : ""}
        {leg.seatInfo ? <> ／ {leg.seatInfo}</> : null}
        {leg.isLast ? <b className="warn"> ※最終便</b> : null}
      </td>
    </tr>
  );
}

export default function PrintPage() {
  const trip = useResolvedTrip();
  const { itinerary } = useItinerary(trip.id, trip.itinerary);
  const days = groupByDate(itinerary);

  return (
    <div className="print-sheet">
      {/* 画面でだけ出る操作バー（印刷には出ない） */}
      <div className="no-print print-toolbar">
        <p>
          紙の旅程表プレビューです。印刷またはPDF保存できます（A4縦・余白は「標準」推奨）。
        </p>
        <button onClick={() => window.print()}>🖨 印刷する</button>
      </div>

      <header className="sheet-head">
        <div className="sheet-head-main">
          <h1>{trip.title}</h1>
          <p className="sheet-dates">{trip.dateLabel}</p>
        </div>
        <div className="sheet-head-side">
          <p>PP添乗員</p>
          <p>
            {trip.travelers.map((t) => t.name).join("・")} 様
          </p>
        </div>
      </header>

      {trip.summary && <p className="sheet-summary">{trip.summary}</p>}

      {/* 交通・宿泊の要約 */}
      <section className="sheet-block">
        <h2>ご旅行の概要</h2>
        <table className="kv">
          <tbody>
            <LegRow label="往路" leg={trip.legs.outbound} />
            <LegRow label="復路" leg={trip.legs.return} />
            {trip.lodging && (
              <tr>
                <th scope="row">宿泊</th>
                <td>
                  <b>{trip.lodging.name}</b>
                  <br />
                  {trip.lodging.area}
                  <br />
                  チェックイン {trip.lodging.checkIn} ／ チェックアウト{" "}
                  {trip.lodging.checkOut}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      {/* 日ごとの行程 */}
      {days.map(([date, items], i) => (
        <section className="sheet-block day-block" key={date || i}>
          <h2>
            {days.length > 1 ? `第${i + 1}日　` : ""}
            {formatDate(date)}
          </h2>
          <table className="itin">
            <thead>
              <tr>
                <th className="col-time">時刻</th>
                <th className="col-title">行程</th>
                <th className="col-note">メモ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id}>
                  <td className="col-time">
                    {it.time.start}
                    <br />
                    <span className="dim">〜{it.time.end}</span>
                  </td>
                  <td className="col-title">
                    {it.emoji} {it.title}
                  </td>
                  <td className="col-note">{it.notes}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}

      {/* お店 */}
      {trip.stores.length > 0 && (
        <section className="sheet-block">
          <h2>お食事・お買い物</h2>
          <table className="itin">
            <thead>
              <tr>
                <th className="col-title">店名</th>
                <th>営業・場所</th>
                <th className="col-note">おすすめ・備考</th>
              </tr>
            </thead>
            <tbody>
              {trip.stores.map((s) => (
                <tr key={s.id}>
                  <td className="col-title">
                    {s.emoji} <b>{s.name}</b>
                    {s.reading ? (
                      <>
                        <br />
                        <span className="dim">{s.reading}</span>
                      </>
                    ) : null}
                  </td>
                  <td>
                    {s.nearStation}
                    {s.hours ? (
                      <>
                        <br />
                        {s.hours}
                      </>
                    ) : null}
                    {s.closedDay ? `／定休 ${s.closedDay}` : ""}
                  </td>
                  <td className="col-note">
                    {s.budget ? <>予算 {s.budget}／</> : null}
                    {s.payment}
                    {s.highlights.map((h, i) => (
                      <span key={i}>
                        <br />
                        <b>{h.primary}</b>
                        {h.sub ? <> — {h.sub}</> : null}
                      </span>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* 緊急・連絡先 */}
      <section className="sheet-block">
        <h2>緊急時・お問い合わせ</h2>
        <p className="warn-box">
          <b>{trip.emergency.warning.title}</b>
          <br />
          {trip.emergency.warning.note}
        </p>
        {trip.emergency.safetyNets.length > 0 && (
          <>
            <h3>代替手段</h3>
            <ul>
              {trip.emergency.safetyNets.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          </>
        )}
        {trip.emergency.sections.map((sec) => (
          <div key={sec.title}>
            <h3>{sec.title}</h3>
            <ul>
              {sec.lines.map((l, i) => (
                <li key={i}>{l}</li>
              ))}
            </ul>
          </div>
        ))}
      </section>

      {/* 持ち物・確認事項 */}
      {(trip.reminders.length > 0 || trip.confirmList.length > 0) && (
        <section className="sheet-block">
          <h2>出発前の確認</h2>
          {trip.reminders.length > 0 && (
            <>
              <h3>当日の注意</h3>
              <ul>
                {trip.reminders.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </>
          )}
          {trip.confirmList.length > 0 && (
            <>
              <h3>要確認</h3>
              <ul className="checklist">
                {trip.confirmList.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <footer className="sheet-foot">
        <p>
          PP添乗員 ／ {trip.title}（{trip.dateLabel}）
        </p>
        <p className="dim">
          この旅程表は出力時点の予定です。当日の変更はアプリ側が最新です。
        </p>
      </footer>
    </div>
  );
}
