# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

# PP添乗員（旅行ガイド Web アプリ）

スマホ向けの旅行ガイド。複数の旅を切り替えられ、AI が当日の行動を案内する。
最初の旅は北邑夫婦の韓国日帰り（弾丸ソウル 2026.06.17）。2件目は姫路・岡山 1泊2日（2026.07.29–30）。

- 本番: Vercel（https://seoul-2026-eight.vercel.app）。`primecool.com` 限定の Google 認証。
- ブランド名: **PP添乗員**（ファビコンは「PT」ロゴ）。
- 元の企画メモ・原データは `docs/`（`docs/CLAUDE.md` 等）に保全。

## コマンド
- `npm run dev` … 開発サーバ（http://localhost:3000）。
- `npm run build` … 本番ビルド（Turbopack）。**型チェックはこのビルドに内包**（型エラーで失敗）。
- `npm start` … ビルド済みを本番モードで起動。
- `npx tsc --noEmit -p tsconfig.json` … 単体の型チェック（編集後の素早い確認に推奨）。
- `vercel --prod` … 本番デプロイ（環境変数は Vercel 側に設定済み）。
- **テスト/Lint のセットアップは無い**（テストランナー・ESLint設定なし）。検証は「型チェック → build → 実機で目視」。
  位置情報・通知・現在時刻ラインの確認には、ホーム/タイムラインの 🕐（TIMENOW 仮設定）で「いま」を当日にずらす。

## 技術スタック
- Next.js 16（App Router, Turbopack）+ React 19 + TypeScript
- Tailwind v4（CSS変数ベースのテーマ）
- 認証: Auth.js v5（`next-auth@beta`）+ Google Provider
- AI: `@anthropic-ai/sdk`、モデル `claude-opus-4-8`（**サーバー側のみ**）
- ホスティング: Vercel（本番）/ Docker 自前ホスト（`Dockerfile`・`docs/docker.md`）
- データ: 静的JSON（`app/data/trips/<id>.json`）がベース（不変）。当日の編集は**差分オーバーレイ**で持ち、
  共有ストア（Upstash Redis・**任意**）＋ localStorage に保存。DBは必須でない。

> ⚠️ Next.js 16 は破壊的変更あり。middleware は **`proxy.ts`** に改名。`params`/`searchParams` は Promise。
> 迷ったら `node_modules/next/dist/docs/` を参照（`AGENTS.md`）。

## 認証（全ページ保護）
- `auth.ts`（`@/auth`）= NextAuth設定。`signIn` コールバックで `email_verified && @primecool.com` のみ許可。
  Google同意画面は Workspace の **Internal** + `hd=primecool.com` で二重制限。`trustHost: true`。
- `proxy.ts`（旧middleware）が全ページをゲート（除外: `api/auth` / `login` / 静的）。
- `app/api/auth/[...nextauth]/route.ts`、ログインは `app/login`。
- 必須環境変数: `AUTH_SECRET` / `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` / `ANTHROPIC_API_KEY`
  （Vercel env と `.env.local`。雛形は `.env.example`）。
- 任意: `KV_REST_API_URL` / `KV_REST_API_TOKEN`（Upstash Redis）。旅程編集の2台共有に使用。
  未設定なら編集は端末ローカル(localStorage)のみで動作（アプリは正常稼働）。

## 複数旅アーキテクチャ（重要）
構造の違う旅を共通モデルに正規化して描画する。

- **旅レジストリ** `app/lib/trips.ts`: `TripMeta`（id/name/destination/emoji/dateLabel/status）。
- **旅データ** `app/data/trips/<id>.json`（seoul-2026.json / himeji-okayama-2026.json）。
- **正規化** `app/lib/resolveTrip.ts`: `resolveTrip(id)` が両JSONを共通 `ResolvedTrip` に変換
  （legs / stores+highlights / payment.methods+currency / emergency.sections / toilets /
  weather / apps / reminders / confirmList / nav / hasPhrases・hasChecklist）。
  クライアントは `useResolvedTrip()`、サーバー(API)は `resolveTrip(id)`。
- **選択中の旅** `app/lib/useTrip.ts`（`useSyncExternalStore`＋共有ストアで**同一タブ内も即時同期**）。
- `TripSwitcher`（ヘッダーの「🧭 旅の変更」ボタン）/ `TripGate`（coming-soon は準備中画面）/
  `ThemeApplier`（`<html data-trip>` とステータスバー色を旅に追従）。

### 新しい旅の追加手順
1. `app/data/trips/<id>.json` を用意（生成プロンプトは `docs/himeji-json-prompt.md`）。
2. `app/lib/trips.ts` にエントリ追加、`status: "ready"`。
3. `app/lib/resolveTrip.ts` にその旅のマッピング（必要なら `placeLinks.ts` / 配色テーマも）。

## 配色テーマ（旅ごと）
`app/globals.css` の CSS変数で定義。`:root` = 早稲田の臙脂（国内既定）、
`:root[data-trip="seoul-2026"]` = 青・白・赤（韓国）。差し色は `--accent2`（韓国=赤）。
フォントは Montserrat（Gotham代替, Bold基調）＋ Noto Sans JP/KR。

## ページ / ナビ
`/`（ホーム=現在地・次ToDo・**最終便カウントダウン**・天気・移動・宿・便利アプリ・要確認・豆知識）、
`/timeline`（**カレンダー型**）、`/phrases`（ソウルのみ）、`/stores`、`/payment`、
`/toilets`（**現在地で近い順**対応）、`/checklist`（ソウルのみ）、`/emergency`。
ナビは `resolveTrip(id).nav` で旅ごとに出し分け（姫路はフレーズ/準備を非表示）。

## 当日ライブ編集＆アジャイル機能（重要）
旅程を当日その場で動的に変更できる。ベースJSONは不変、編集は差分で重ねる。
- **差分オーバーレイ** `app/lib/itinerary.ts`：`ItineraryOverlay`(added/updated/removed＋rev)、
  `applyOverlay`/`applyOps`(EditOp列→差分)/`shiftAfterOps`(以降ずらし)/`checkLastLegConflicts`(最終便検算)。純データ層。
- **共有＆同期** `app/lib/useItinerary.ts`：localStorage即描画→`/api/itinerary`(KV)取得で収束、楽観更新→PUT。
  `app/lib/kv.ts`＋`app/api/itinerary/route.ts`(GET/PUT・auth必須・revで楽観ロック409・KV未設定でも動作)。
  timeline と HomeClient がこれ経由（NowCard/NextTodoCard 等は props で受ける）。
- **カレンダー型タイムライン** `app/components/TimelineCalendar.tsx`：時間比例の高さ(最低46px,1.7px/分)、
  重なりは横レーン、現在時刻ライン、**往復便も時間ブロック表示**(便は深夜便の日付も実日付で判定)。
  タップで詳細シート（編集/削除/完了/±分ずらし/地図）。
- **編集UI**：`AiEditPanel.tsx`(AIに依頼→差分プレビュー→適用)、`ItineraryItemForm.tsx`(手動add/edit)。
- **実績** `app/lib/useActuals.ts`（完了マーク・端末ローカル）。
- **最終便カウントダウン＋撤退アラート** `HomewardCountdown.tsx`（Home。出発6h前から、空港着目安超過で赤＋通知）。
- **現在地** `app/lib/useGeo.ts`＋`toiletGeo.ts`（トイレを直線距離で近い順）。
- **疑似時刻(TIMENOW)**：`useNow` を実時刻との差分(offset)方式に。`setNowOverride`/`useNowOffset`、
  `NowOverridePanel`(ホーム/タイムラインの🕐)。デモ・動作確認用に「いま」を仮設定できる。

## AI 機能（`/api/assistant`、POST、認証必須）
- `mode: "next-todo"` … 前後の予定からフレンドリーな案内文（`NextTodoCard`）。
- `mode: "replan"` … 予定変更を渡し最終便制約を踏まえ文章で組み直し提案（`ReplanButton`）。
- `mode: "edit"` … 変更要望を**操作リスト(ops)だけ**構造化出力で返す（全文JSON再生成せずトークン小。`AiEditPanel`）。
- 旅ごとのコンテキスト（`buildTripContext` が `ResolvedTrip` から生成）。キーはブラウザに出さない。

## 補助データ
- `app/lib/phrases.ts`（韓国語フレーズ。ソウル専用）。
- `app/lib/placeLinks.ts`（行程ID→地図検索クエリ＋公式リンク。ソウル=NAVER / 国内=Google）。
- `app/lib/useNow.ts`（現在時刻 Asia/Seoul・TIMENOW仮設定・`seoulWallToMs`等）、
  `data.ts`（時刻計算・WHO色・パースペクティブ）。

## 重要な決定事項（ソウル）
- 復路 MM808(22:35) は**最終便**。ピーチ締切は出発50分前。19:36 AREX が本線。
- 決済: T-money(交通)・Mastercard(カード可)・現金(ローカル)。WOWPASSは夜ソウル駅で現金化一択。
  カードは必ずウォン建て（DCC回避）。
- e-Arrival Card 出発前申請必須 / K-ETA 2026末まで免除。
- 名前表記は **靖晃**・**ひとみ**。日本語メイン、韓国語は補助。

## 運用メモ
- デプロイは `vercel --prod`（→「コマンド」節）。本番URLは固定エイリアス `seoul-2026-eight.vercel.app`。
- Anthropic API キーは平文で共有された経緯があり、本番前のローテーション推奨。
