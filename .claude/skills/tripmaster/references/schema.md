# 国内旅 JSON スキーマ（姫路型・完全版）

`app/data/trips/<id>.json` の正式スキーマ。`resolveTrip.ts` の `HimejiData` 型と1:1対応。
**単一の真実は `app/lib/tripJsonPrompt.ts` の `SCHEMA_JSON`**（/admin の生成プロンプトと同源）。
この文書はその写し＋記入ルール解説 — 食い違いがあれば tripJsonPrompt.ts に合わせてここを直す。
docs/himeji-json-prompt.md は **extras を含まない旧版**なので参照しない。
実例: `app/data/trips/himeji-okayama-2026.json`（新幹線→飛行機の混成）、`okinawa-2026.json`（往復フライト＋レンタカー）。

## 記入ルール

- キー名はこのスキーマに厳密に従う。余分なキーは足さない（`_confirm` と `extras` を忘れない）。
- 時刻は 24時間表記 `"HH:MM"`。タイムゾーンは `"Asia/Tokyo"`。
- `itinerary` の各項目に **`date`（"YYYY-MM-DD"）必須**。深夜帯も実際の日付で書く。
- `who` は `"夫婦"` / `"靖晃"` / `"ひとみ"` のみ。別行動がなければ全て `"夫婦"`。
- id（itinerary / stores）は kebab-case で一意。行程は `day1-` `day2-` プレフィックス推奨。
- 未確定の値は `""`、`rating` 不明は `null`。要確認事項は `_confirm` に日本語で列挙。
- 推定値（所要時間など）は `notes` に「(目安)」と明記。
- `transport.outbound/return` は往復の幹線交通（新幹線 or 飛行機）。`type` が `"新幹線"` なら 🚄、それ以外は ✈️ で描画される。レンタカーの貸出/返却は itinerary 項目で表現。
- 復路には `isLast: true` を付け、`notes` に乗り遅れた場合の重大さを書く（緊急ページの警告カードに使われる）。

## スキーマ

```json
{
  "trip": {
    "title": "函館 2027",
    "startDate": "2027-05-01",
    "endDate": "2027-05-02",
    "dayOfWeek": "土・日",
    "summary": "1泊2日。1日目は…、2日目は…。",
    "travelers": [
      { "name": "靖晃", "note": "" },
      { "name": "ひとみ", "note": "" }
    ]
  },
  "transport": {
    "outbound": {
      "name": "便名 / 列車名（例: ANA553便 / はやぶさ1号）",
      "type": "飛行機 or 新幹線",
      "departure": { "station": "出発地（駅・空港名）", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "arrival":   { "station": "到着地", "time": "HH:MM", "date": "YYYY-MM-DD" },
      "seat": "座席（例: 靖晃22A / ひとみ22B）",
      "notes": ""
    },
    "return": {
      "name": "",
      "type": "",
      "departure": { "station": "", "time": "", "date": "" },
      "arrival":   { "station": "", "time": "", "date": "" },
      "seat": "",
      "isLast": true,
      "notes": "最終便。乗り遅れると当日中に帰れない。"
    }
  },
  "lodging": {
    "name": "宿名",
    "area": "エリア（例: 函館駅前）",
    "checkIn": "15:00",
    "checkOut": "10:00",
    "notes": "予約番号・朝食有無など"
  },
  "itinerary": [
    {
      "id": "day1-flight-out",
      "time": { "start": "HH:MM", "end": "HH:MM", "tz": "Asia/Tokyo", "date": "YYYY-MM-DD" },
      "who": "夫婦",
      "emoji": "✈️",
      "title": "予定のタイトル",
      "notes": "備考・注意点・移動手段など"
    }
  ],
  "stores": [
    {
      "id": "hakodate-asaichi",
      "name": "店名",
      "reading": "よみがな",
      "category": "昼食 / 夕食 / カフェ / 名物 など",
      "emoji": "🍜",
      "address": "",
      "nearStation": "最寄り駅・目印",
      "hours": "営業時間",
      "closedDay": "定休日",
      "rating": null,
      "payment": "現金のみ / カード可 / IC可 など",
      "budget": "1人◯円 など",
      "signatureDish": "名物・おすすめの一品",
      "orderTip": "頼み方や食べ方のコツ",
      "notes": "",
      "mapQuery": "Googleマップでの検索語（店名＋地名）"
    }
  ],
  "payment": {
    "strategy": "現金・クレジットカード・ICカードの使い分け方針（1〜2文）",
    "ic":   { "role": "在来線・バス・コンビニ", "note": "" },
    "card": { "role": "宿・大きめの飲食店", "note": "" },
    "cash": { "role": "現金のみの店・寺社・屋台", "note": "" }
  },
  "emergency": {
    "lastTrain": { "name": "復路の便名", "departure": "HH:MM", "note": "最終便。後がない。" },
    "safetyNets": [
      "前倒し便・代替交通などの安全網を文字列で列挙"
    ],
    "ifMissed": { "plan": "乗り遅れた場合の対応（宿泊・始発・代替交通）" },
    "contacts": [
      { "label": "宿", "value": "電話番号" },
      { "label": "航空会社", "value": "" }
    ]
  },
  "tips": [
    { "title": "豆知識・注意点のタイトル", "body": "本文" }
  ],
  "_confirm": [
    "要確認の項目を日本語で列挙（座席未定・予約番号未取得など）"
  ],
  "extras": {
    "initialCash": 30000,
    "reminders": [
      "前日〜当日朝のリマインダー（モバイル搭乗券の発行、充電、ICチャージなど）"
    ],
    "apps": [
      { "label": "Googleマップ", "emoji": "🗺", "url": "https://www.google.com/maps", "note": "ナビ・店検索" },
      { "label": "航空会社アプリ等", "emoji": "✈️", "url": "https://…", "note": "搭乗券・遅延情報" }
    ],
    "toilets": [
      {
        "rank": 1,
        "name": "スポット名（駅・空港・大型施設）",
        "area": "エリア名",
        "clean": "★★★ 広く清潔",
        "tip": "使いどきのアドバイス",
        "near": [
          { "spot": "近くの観光名所・行程上の地点", "walk": "徒歩◯分" }
        ]
      }
    ],
    "weather": [
      { "label": "函館", "lat": 41.7687, "lon": 140.7288, "date": "2027-05-01" }
    ]
  }
}
```

## extras の補足

- `initialCash` … 持っていく現金額（円・number）。ホームと決済ページの現金残高の初期値。
- `reminders` … 前日リマインダー。ホームに表示。5件前後。
- `apps` … 当日使う便利アプリ/サイトへの直リンク。`emoji` は1文字。
- `toilets` … `/toilets` ページのデータ。`rank` 昇順・4〜6件。`near` の `spot` は行程上の地点名に合わせると現在地ソートが活きる。
- `weather` … ホームの天気カード用。**日数 × 主要エリア**分（例: 2泊3日で3件〜）。`lat`/`lon` は実在の座標を調べて入れる（Open-Meteo に渡される）。`date` はその地点にいる日。
