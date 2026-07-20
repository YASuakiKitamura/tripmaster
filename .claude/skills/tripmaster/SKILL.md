---
name: tripmaster
description: 会話などで既に練った旅の計画を、このアプリ（PP添乗員）が読み込める tripmaster 形式に整形して取り込む。計画内容（この会話・貼り付けたメモ・別チャットの成果物）から姫路型スキーマの JSON を生成 → レジストリ登録 → 型チェックまで一気通貫で行う。「この旅を取り込んで」「tripmaster形式にして」「アプリに追加して」などで使用。
---

# tripmaster — 練った旅の計画をアプリに流し込む

前提: 旅の内容は**すでにある程度確定している**（この会話で練った、別チャットの結論を貼り付けた、計画メモがある等）。
このスキルの仕事はゼロからのヒアリングではなく、**既存の計画内容をスキーマに正確に写し取り、足りない穴だけをピンポイントで確認**すること。
**まず `references/schema.md` を読んでから**始めること（JSONの正式スキーマと記入ルールが書いてある）。

## 前提知識

- ベースは静的JSON（`app/data/trips/<id>.json`）。当日の編集は差分オーバーレイなので、ベースJSONは「計画時点の確定情報」を入れる。
- **国内旅**（姫路・沖縄と同じ構造）はコードを書かずに追加できる: JSON + レジストリ2ファイルへの1行ずつの追記だけ。
- **海外旅**（外貨・フレーズ・入国審査あり）は専用リゾルバの実装が必要（ソウルの `resolveSeoul` 参照）。ヒアリングで海外と判明したら、その旨をユーザーに伝えたうえで進め方（国内型スキーマで近似するか、専用リゾルバを書くか）を確認する。
- レンタカー旅でも `transport.outbound/return` は**往復のフライト（or 新幹線）**。レンタカーの貸出/返却は itinerary の項目として表現する。
- 固定ルール: 旅行者は **靖晃**・**ひとみ** 夫婦。`who` は `"夫婦" | "靖晃" | "ひとみ"`。時刻は `"HH:MM"`、国内は tz `"Asia/Tokyo"`。

## Step 1 — 計画内容の取り込みとギャップ確認

1. **材料を集める**: 計画がこの会話に無ければ「計画の内容（チャットの結論・メモ・予約確認メール）を貼り付けてください」と促す。複数回に分けた貼り付けも歓迎する。
2. **スキーマに写し取る**: 材料を読み、スキーマの全セクション（trip / transport / lodging / itinerary / stores / payment / emergency / tips / extras）に振り分ける。
   - 材料に書いてあることは**改変せずそのまま**使う（時刻・便名・店名・金額）。勝手に「改善」しない。
   - 材料から推定で補った箇所（所要時間・移動手段など）は notes に「(目安)」と明記。
   - **不明な値は空文字 `""` のままにして `_confirm` に日本語で列挙**する。無理に埋めない。
3. **ギャップの棚卸しを提示**: 写し取った結果のサマリー（日程・往復・宿・行程数・店数）と「材料に無かった項目」の一覧を見せる。
   そのうえで、**アプリの動作に効く重要な穴だけ**ピンポイントで質問する（AskUserQuestion 可）:
   - 復路の最終便/最終列車の時刻と `isLast`（撤退アラート・緊急ページに直結）
   - 持っていく現金額 `extras.initialCash`（残高トラッカーの初期値）
   - 旅の絵文字・名称・テーマ色の希望（任意）
   - それ以外の穴は `_confirm` に残して先に進んでよい（当日ライブ編集で埋められる）。
4. **extras は提案ベースで埋める**: reminders・apps・toilets・weather は材料に書かれていないことが多い。過去の旅（himeji-okayama-2026.json / okinawa-2026.json）を参考に妥当なドラフトを作って「これでいい？」と確認する。weather の lat/lon は実在の座標を調べて入れる。

## Step 2 — 取り込み用 JSON の生成

スキーマに厳密に従って旅データ JSON を生成する。

- **スキーマの単一の真実は `app/lib/tripJsonPrompt.ts` の `SCHEMA_JSON`**（/admin の生成プロンプトと同源）。
  `references/schema.md` はその写し＋記入ルール解説。食い違っていたら tripJsonPrompt.ts を正とし、schema.md を直す。
- id は `<destination>-<year>` 形式の kebab-case（例: `hakodate-2027`）。
- **`extras` キーは必須**（docs/himeji-json-prompt.md の旧スキーマには無いので注意）。
- 生成後に `python3 -m json.tool` などで JSON の妥当性を確認。
- itinerary の id はすべて一意か、全項目に `date` があるか、`who` が3値のいずれかを確認。

## Step 3 — 取り込みルートの選択

生成した JSON をアプリに入れる方法は2つ。ユーザーに確認する（AskUserQuestion 可）:

- **ルートA: 直接配線（推奨・このリポジトリで完結）** … Step 3A へ。JSON をリポジトリに書き、レジストリも自分で編集する。
- **ルートB: /admin で読み込み（GUI派・取り込み用ファイルだけ欲しい場合）** … Step 3B へ。
  ファイルを渡すだけで、コード登録は /admin が自動で行う。

## Step 3A — 直接配線（2ファイル・マーカー行の直上に挿入）

`app/data/trips/<id>.json` に JSON を書き込んだうえで:

1. `app/lib/trips.ts` — `// ADMIN:TRIPS-END` マーカーの**直上**にエントリ追加:
   ```ts
   {
     id: "<id>",
     name: "<旅の名称>",
     destination: "<行き先>",
     emoji: "<絵文字>",
     dateLabel: "2027.MM.DD–MM.DD",
     status: "ready",
     teaser: "<一言>",
   },
   ```
2. `app/lib/resolveTrip.ts` — 2箇所:
   - `// ADMIN:IMPORTS-END` の直上: `import <camelId>Raw from "@/app/data/trips/<id>.json";`
     とその下の既存パターンに合わせて `const <camelId> = <camelId>Raw as unknown as HimejiData;`
     （既存は import 直後でなく `himeji`/`okinawa` の定義箇所にある — 既存コードの置き場に合わせる）
   - `DOMESTIC` マップの `// ADMIN:DOMESTIC-END` の直上: `"<id>": <camelId>,`

変換ロジック（`resolveDomestic`）は**触らない**。旅ごとの差分は JSON の `extras` に入っている。

## Step 3B — /admin 取り込み用ファイルの出力

コードは一切編集しない。生成した JSON を渡すだけ:

1. `~/Downloads/<id>.json` に整形（インデント2）して保存する。あわせて
   `cat <file> | pbcopy` でクリップボードにも入れておくと親切（📋 ボタンで即貼れる）。
2. ユーザーへの案内（devサーバ起動中の前提。止まっていれば `npm run dev`）:
   - http://localhost:3000/admin を開く
   - 「＋ 新規作成」で **同じ id** を入力して作成（`trips.ts`/`resolveTrip.ts` への登録はここで自動）
   - 開いたエディタで「📂 生成JSONを読み込む」（保存したファイルを選択）または「📋 クリップボードから」
   - 内容を確認して「保存」→ ページをリロードして反映確認
3. 注意: /admin の書き込みは**ローカル/Docker のみ**。本番反映は `vercel --prod` の再デプロイ。

## Step 4 — 任意の仕上げ（ユーザーに要否を確認・どちらのルートでも可）

- **地図リンク**: `app/lib/placeLinks.ts` に `const <ID>: Record<string, PlaceLink>` テーブルを追加し、`getPlaceLink` の分岐に組み込む（行程IDごとの地図クエリ＋公式URL）。未定義でも動く（リンクが出ないだけ）。
- **配色テーマ**: `app/globals.css` に `:root[data-trip="<id>"] { --bg / --accent / --accent-light / --accent-dark / --accent2 }` を追加（沖縄のブロックが手本）。無ければ既定の臙脂。

## Step 5 — 検証

- **ルートA（直接配線）**:
  1. `npx tsc --noEmit -p tsconfig.json` … 型チェック（必須）。
  2. `npm run build` … 本番ビルドが通ること（時間があれば）。
- **ルートB（/admin）**: コードを触っていないので型チェック不要。ユーザーの保存後、
  `app/data/trips/<id>.json` が書かれ `trips.ts` に登録されたことを確認できると良い。
- **共通・目視**: dev サーバで「🧭 旅の変更」から新しい旅に切替 → ホーム・タイムライン・店舗・決済・緊急が表示されるか。
  当日挙動（現在時刻ライン・カウントダウン）はホームの 🕐（TIMENOW）で「いま」を旅当日にずらして確認。

## Step 6 — 報告

- 追加/変更したファイル一覧と、`_confirm`（要確認の残項目）をユーザーに提示。
- 本番反映は再デプロイ（`vercel --prod`）が必要な旨を伝える（ベースJSONはビルドに焼き込まれるため）。
- コミットはユーザーに求められた場合のみ。プレフィックスは `feat:`（例: `feat: 函館 2027 の旅データを追加`）。
