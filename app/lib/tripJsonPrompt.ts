// 旅計画チャット（ChatGPT / Claude 等）に渡して、PP添乗員用の旅データ JSON を
// 生成させるためのプロンプトを組み立てる。/admin からダウンロードして使う。
//
// ⚠️ ここが「生成プロンプトの単一の真実」。resolveDomestic が読むスキーマ（特に extras）に
//    厳密に合わせること。docs/himeji-json-prompt.md は extras を欠くため、こちらを正とする。

export interface PromptOptions {
  id: string;
  name?: string;
  destination?: string;
  dateLabel?: string;
}

// resolveDomestic（app/lib/resolveTrip.ts）が読むキーに対応した出力スキーマの見本。
// この JSON 文字列にはバックティックを含めない（テンプレートリテラル内で安全に埋め込むため）。
const SCHEMA_JSON = `{
  "trip": {
    "title": "旅の名称",
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "dayOfWeek": "水・木 など",
    "summary": "旅程の要約（1〜2文）",
    "travelers": [
      { "name": "靖晃", "note": "" },
      { "name": "ひとみ", "note": "" }
    ]
  },
  "transport": {
    "outbound": {
      "name": "便名・列車名（例: ANA411 / のぞみ○号）",
      "type": "飛行機 または 新幹線",
      "departure": { "station": "出発地", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "arrival":   { "station": "到着地", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "seat": "",
      "notes": ""
    },
    "return": {
      "name": "便名・列車名",
      "type": "飛行機 または 新幹線",
      "departure": { "station": "出発地", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "arrival":   { "station": "到着地", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "seat": "",
      "isLast": true,
      "notes": "最終便/最終列車。乗り遅れると当日中に帰れない 等"
    }
  },
  "lodging": {
    "name": "宿名",
    "area": "住所・エリア",
    "checkIn": "15:00",
    "checkOut": "10:00",
    "notes": ""
  },
  "itinerary": [
    {
      "id": "kebab-case-の一意id（例: day1-himeji-castle）",
      "time": { "start": "HH:MM", "end": "HH:MM", "tz": "Asia/Tokyo", "date": "YYYY-MM-DD" },
      "who": "夫婦",
      "emoji": "🏯",
      "title": "予定のタイトル",
      "notes": "備考・移動手段・注意点（推定は「(目安)」と明記）"
    }
  ],
  "stores": [
    {
      "id": "kebab-case-の一意id",
      "name": "店名",
      "reading": "よみがな",
      "category": "昼食 / 夕食 / カフェ / 名物 など",
      "emoji": "🍜",
      "address": "",
      "nearStation": "",
      "hours": "",
      "closedDay": "",
      "rating": null,
      "payment": "現金のみ / カード可 / IC可 など",
      "budget": "1人◯円 など",
      "signatureDish": "名物・おすすめの一品",
      "orderTip": "頼み方・食べ方のコツ",
      "notes": "",
      "mapQuery": "Googleマップ検索語（店名＋地名）"
    }
  ],
  "payment": {
    "strategy": "現金・クレジットカード・ICカードの使い分け方針",
    "ic":   { "role": "在来線・バス・コンビニ", "note": "" },
    "card": { "role": "ホテル・新幹線・大型店", "note": "" },
    "cash": { "role": "現金のみの店・寺社・屋台", "note": "" }
  },
  "emergency": {
    "lastTrain": { "name": "復路便/列車", "departure": "HH:MM", "note": "後がない 等" },
    "safetyNets": [ "代替手段・前倒し便などを文字列で列挙" ],
    "ifMissed": { "plan": "乗り遅れた場合の対応（宿泊・始発・代替交通）" },
    "contacts": [ { "label": "宿", "value": "電話番号など" } ]
  },
  "tips": [
    { "title": "豆知識・注意点のタイトル", "body": "本文" }
  ],
  "_confirm": [ "要確認の項目を日本語で列挙" ],
  "extras": {
    "initialCash": 20000,
    "reminders": [ "復路便に乗り遅れない 等、当日の注意を文字列で列挙" ],
    "apps": [
      { "label": "Googleマップ", "emoji": "🗺", "url": "https://www.google.com/maps", "note": "ナビ・店検索" },
      { "label": "Yahoo!乗換案内", "emoji": "🚆", "url": "https://transit.yahoo.co.jp/", "note": "時刻/乗換" }
    ],
    "toilets": [
      {
        "rank": 1,
        "name": "○○駅 構内 など",
        "area": "エリア名",
        "clean": "★★★ 清潔さの目安（★3つで表現）",
        "tip": "ひとこと（任意）",
        "near": [ { "spot": "近くの観光名所", "walk": "徒歩◯分" } ]
      }
    ],
    "weather": [
      { "label": "地名", "lat": 34.84, "lon": 134.69, "date": "YYYY-MM-DD" }
    ]
  }
}`;

/** 旅計画チャットに貼り付ける生成プロンプト（Markdown）を返す。 */
export function buildTripJsonPrompt(opts: PromptOptions): string {
  const name = opts.name?.trim() || opts.id;
  const dateLabel = opts.dateLabel?.trim();
  const destination = opts.destination?.trim();

  return [
    `# 旅程JSON生成プロンプト（${name}）`,
    ``,
    `旅行プランを相談しているチャット（ChatGPT / Claude 等）に、`,
    `下の「---」以降をそのまま貼り付けて使ってください。`,
    `出てきた JSON を PP添乗員の管理ページ（/admin）で旅「${opts.id}」を選び、`,
    `エディタに貼り付けて保存します。`,
    ``,
    `---`,
    ``,
    `あなたは旅行プランを構造化データに変換するアシスタントです。`,
    `「${name}${dateLabel ? `（${dateLabel}）` : ""}」の旅程を、`,
    `旅行ガイドアプリ「PP添乗員」用の **JSONデータ** として出力してください。`,
    ``,
    `## 出力ルール`,
    `- 出力は **有効なJSONのみ**。前後の説明文・コメント・コードフェンスは付けない。`,
    `- キー名は下記スキーマに厳密に従う（余分なキーを足さない／必須キーを省かない）。`,
    `- 時刻は24時間表記 \`"HH:MM"\`、タイムゾーンは \`"Asia/Tokyo"\`、日付は \`"YYYY-MM-DD"\`。`,
    `- \`itinerary\` の各項目には **必ず \`date\`** を入れる（旅の日付範囲内）。`,
    `- \`who\` は \`"夫婦"\` / \`"靖晃"\` / \`"ひとみ"\` のいずれか（別行動がなければ全て \`"夫婦"\`）。`,
    `- 名前表記は **靖晃**・**ひとみ**。日本語をメイン言語にする。`,
    `- 国内旅行を想定（入国審査・外貨・外国語フレーズの項目は不要）。`,
    `- 確定していない文字列は \`""\`、不明な数値は妥当に推定し \`notes\` に「(目安)」と明記。`,
    `  要確認の点は \`_confirm\` 配列に日本語で列挙する。`,
    `- **\`extras\` ブロックは必須**（アプリのホーム・トイレ・天気・現金残高表示に使う）。`,
    `  \`weather\` の \`lat\`/\`lon\` は各日の主要滞在地の緯度経度を入れる。`,
    ``,
    `## スキーマ（この形・このキー名で出力）`,
    ``,
    "```json",
    SCHEMA_JSON,
    "```",
    ``,
    `## 旅の前提（埋める材料。違っていたら指摘して）`,
    `- 旅: **${name}**${dateLabel ? `（${dateLabel}）` : ""}`,
    destination ? `- 行き先: ${destination}` : `- 行き先: （このチャットで決めた内容を反映）`,
    `- 旅行者: **靖晃・ひとみ** 夫婦`,
    `- まだ決まっていない部分は \`""\` のままにし、\`_confirm\` に列挙する`,
    ``,
    `上記スキーマに沿って、現時点で分かっている範囲で JSON を出力してください。`,
    ``,
  ].join("\n");
}
