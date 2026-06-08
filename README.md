# PP添乗員

スマホ向けの旅行ガイド Web アプリ。旅程・会話フレーズ・決済・店・トイレ・天気・緊急対応を1つに集約し、
**AI が当日の「次の行動」を案内**し、予定変更も組み直す。複数の旅を切り替えて使える。

- **本番**: https://seoul-2026-eight.vercel.app （`primecool.com` ドメインの Google アカウントのみログイン可）
- **収録中の旅**: 弾丸ソウル 2026.06.17（日帰り） / 姫路・岡山 2026.07.29–30（1泊2日）

## 主な機能
- 🕐 現在地カード（今やるべきこと／次の予定を自動表示）＋ ✨ AI による次ToDo案内
- 🗓 **カレンダー型タイムライン**（所要時間に比例した高さ・現在時刻ライン・往復便もブロック表示）
- ✏️ **当日のライブ編集**：AI に話しかけて変更（差分プレビュー→適用）／手動で追加・編集・削除。**2台のスマホで共有**（任意・Upstash）、ワンタップで元に戻す
- 🔁 予定変更・相談（遅延や混雑を伝えると Claude が最終便を守って組み直し／文章での助言）
- ⏱ 実績打刻＆**以降の自動ずらし**（押した分だけ後続予定を一括で繰り下げ／繰り上げ）
- 🛫 **最終便カウントダウン＋撤退アラート**（空港着の目安を過ぎると警告・通知）
- 📍 **現在地から近いトイレ順**（GPS・概算距離／徒歩目安）
- 🕐 現在時刻の仮設定（デモ・動作確認用。ホーム／タイムラインの🕐）
- 🧭 旅の切替（旅ごとに配色も変化：韓国=青白赤 / 国内=早稲田の臙脂）
- 👀 視点切替（混合 / 夫婦＋靖晃 / 夫婦＋ひとみ）
- 🌤 当日の天気（Open-Meteo、予報範囲に入ると自動表示）
- 📍 店ガイド・💳 決済・🚻 きれいなトイレ・💬 フレーズ（韓国）・🆘 緊急対応
- 🗺 各目的地の地図・公式情報リンク（ソウル=NAVER Map / 国内=Google マップ）
- 📱 PWA（ホーム画面に追加で単体アプリ起動）

## 技術
Next.js 16（App Router）/ React 19 / TypeScript / Tailwind v4 /
Auth.js v5（Google, primecool.com 限定）/ Anthropic Claude（`claude-opus-4-8`, サーバー側）/
旅程の共有ストアに Upstash Redis（任意。未設定なら端末ローカルのみで動作）。

詳細な構成・拡張方法は [CLAUDE.md](./CLAUDE.md) を参照。

## 開発
```bash
cp .env.example .env.local   # AUTH_SECRET / Google / ANTHROPIC（＋任意で KV_REST_API_*）
npm install
npm run dev                  # http://localhost:3000
```
> 旅程の2台共有を使うときは Vercel Marketplace で Upstash Redis を追加（`KV_REST_API_URL` / `KV_REST_API_TOKEN` が自動設定）。未設定でも編集は各端末の localStorage に保存され、アプリは通常どおり動作する。

## デプロイ
- **Vercel**: `npm run build` → `vercel --prod`（環境変数は Vercel 側に設定）
- **Docker 自前ホスト**: [docs/docker.md](./docs/docker.md)（`output: standalone` 済み）

## 新しい旅を追加する
1. `app/data/trips/<id>.json` を作成（生成プロンプト: [docs/himeji-json-prompt.md](./docs/himeji-json-prompt.md)）
2. `app/lib/trips.ts` に登録（`status: "ready"`）
3. `app/lib/resolveTrip.ts` にマッピングを追加

## ディレクトリ
```
app/
├─ data/trips/        旅データ JSON（旅ごと）
├─ lib/               trips / resolveTrip / useTrip / placeLinks / phrases / data /
│                     itinerary（差分オーバーレイ）/ useItinerary / kv /
│                     useNow（TIMENOW仮設定）/ useActuals / useGeo / toiletGeo ...
├─ components/        Header / TripSwitcher / TripGate / ThemeApplier / NowCard /
│                     TimelineCalendar / AiEditPanel / ItineraryItemForm /
│                     NowOverridePanel / HomewardCountdown ...
├─ api/assistant/     Claude 連携（next-todo / replan / edit=ops差分生成）
├─ api/itinerary/     旅程オーバーレイの共有ストア（GET/PUT・Upstash）
├─ (各ページ)         timeline / stores / payment / toilets / phrases / checklist / emergency / login
auth.ts, proxy.ts     認証と全ページ保護
docs/                 原データ・企画メモ・各種手順
```
