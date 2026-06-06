# Docker 自前ホスト手順

このアプリは Next.js の `output: "standalone"` を使い、最小の自己完結サーバとして
コンテナ実行できる。Mac/Windows/Linux いずれで開発しても同じイメージが作れる。

## 前提
- Docker / Docker Compose
- 環境変数（`.env.example` をコピーして `.env.local` を作成し値を設定）
  - `AUTH_SECRET`（`openssl rand -base64 33`）
  - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`（Google OAuth）
  - `ANTHROPIC_API_KEY`（Claude）
  - 公開URLが固定なら `AUTH_URL=https://<ドメイン>` を推奨

## ビルドと起動（Compose）
```bash
cp .env.example .env.local   # 値を埋める
docker compose up -d --build
# → http://localhost:3000
```

## ビルドと起動（素のdocker）
```bash
docker build -t pp-tenjoin .
docker run -d --name pp-tenjoin -p 3000:3000 --env-file .env.local pp-tenjoin
```

## Google OAuth の設定
新しい公開ドメインに対して、Google Cloud Console の OAuth クライアントへ
リダイレクトURIを追加する:
```
https://<新ドメイン>/api/auth/callback/google
```

## リバースプロキシ（nginx等）の注意
NextAuth は `trustHost: true` でホストヘッダから公開URLを判定する。
プロキシ配下では以下を転送すること（OAuthコールバックのURL整合のため）:
```
proxy_set_header Host              $host;
proxy_set_header X-Forwarded-Proto $scheme;
proxy_set_header X-Forwarded-Host  $host;
```
固定URLが分かっているなら `AUTH_URL` を明示するのが最も確実。

## 補足
- シークレットはビルド時不要・実行時のみ必要（`--env-file` で注入）。
- 静的書き出し(`output: export`)は不可（認証・middleware・APIルート・SSRのため）。
- データはJSON静的＋クライアントlocalStorageのみでDB不要。永続ボリューム不要。
