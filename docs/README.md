# seoul-2026

弾丸ソウル 2026.06.17 — 夫婦専用旅行ガイドWebアプリ

## 概要

北邑靖晃・ひとみ夫婦による韓国日帰り旅行の作戦書を、スマホ向けWebアプリとして構築するプロジェクト。

## セットアップ

```bash
# Claude Code でプロジェクトを開く
cd seoul-2026
claude

# Claude Code に指示する例
> CLAUDE.md を読んで、Next.js プロジェクトを初期化して。
> trip-data.json のデータを使って、タイムラインページを作って。
> Google OAuth で primecool.com ドメイン制限を入れて。
```

## ファイル構成

```
seoul-2026/
├── CLAUDE.md                    # Claude Code への指示書（最重要）
├── trip-data.json               # 旅程・店舗・決済・フレーズの構造化データ
├── korean_food_phrases.html     # デザインリファレンス（元のHTMLフレーズ集）
└── README.md                    # このファイル
```

## アクセス制御

primecool.com ドメインの Google アカウントのみ。
