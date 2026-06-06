# PP添乗員

スマホ向けの旅行ガイド Web アプリ。旅程・会話フレーズ・決済・店・トイレ・天気・緊急対応を1つに集約し、
**AI が当日の「次の行動」を案内**し、予定変更も組み直す。複数の旅を切り替えて使える。

- **本番**: https://seoul-2026-eight.vercel.app （`primecool.com` ドメインの Google アカウントのみログイン可）
- **収録中の旅**: 弾丸ソウル 2026.06.17（日帰り） / 姫路・岡山 2026.07.29–30（1泊2日）

## 主な機能
- 🕐 現在地カード（今やるべきこと／次の予定を自動表示）＋ ✨ AI による次ToDo案内
- 🔁 予定変更・相談（遅延や混雑を伝えると Claude が最終便を守って組み直し）
- 🧭 旅の切替（旅ごとに配色も変化：韓国=青白赤 / 国内=早稲田の臙脂）
- 👀 視点切替（混合 / 夫婦＋靖晃 / 夫婦＋ひとみ）
- 🌤 当日の天気（Open-Meteo、予報範囲に入ると自動表示）
- 📍 店ガイド・💳 決済・🚻 きれいなトイレ・💬 フレーズ（韓国）・🆘 緊急対応
- 🗺 各目的地の地図・公式情報リンク（ソウル=NAVER Map / 国内=Google マップ）
- 📱 PWA（ホーム画面に追加で単体アプリ起動）

## 技術
Next.js 16（App Router）/ React 19 / TypeScript / Tailwind v4 /
Auth.js v5（Google, primecool.com 限定）/ Anthropic Claude（`claude-opus-4-8`, サーバー側）。

詳細な構成・拡張方法は [CLAUDE.md](./CLAUDE.md) を参照。

## 開発
```bash
cp .env.example .env.local   # AUTH_SECRET / Google / ANTHROPIC を設定
npm install
npm run dev                  # http://localhost:3000
```

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
├─ lib/               trips / resolveTrip / useTrip / placeLinks / phrases / data ...
├─ components/        Header / TripSwitcher / TripGate / ThemeApplier / NowCard / ...
├─ api/assistant/     Claude 連携（next-todo / replan）
├─ (各ページ)         timeline / stores / payment / toilets / phrases / checklist / emergency / login
auth.ts, proxy.ts     認証と全ページ保護
docs/                 原データ・企画メモ・各種手順
```
