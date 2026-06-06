// Next.js 16 では Middleware は「Proxy」に改名された（機能は同じ）。
// NextAuth の auth ハンドラをそのまま proxy として使い、全ページを保護する。
import { auth } from "@/auth";

export default auth;

export const config = {
  // 認証API・ログインページ・静的アセットは保護対象から除外
  matcher: [
    "/((?!api/auth|login|_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
