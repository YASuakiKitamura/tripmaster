import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

// このドメインの Google アカウントのみログインを許可する
export const ALLOWED_DOMAIN = "primecool.com";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      // Google 側でも所属ドメインを絞り込む（hd = hosted domain）
      authorization: {
        params: { hd: ALLOWED_DOMAIN, prompt: "select_account" },
      },
    }),
  ],
  pages: {
    signIn: "/login",
    error: "/login",
  },
  callbacks: {
    // ドメイン制限：primecool.com の確認済みメールのみ通す
    async signIn({ profile }) {
      const email = profile?.email ?? "";
      const verified = profile?.email_verified === true;
      return verified && email.toLowerCase().endsWith(`@${ALLOWED_DOMAIN}`);
    },
    // proxy(ミドルウェア)での保護判定：ログイン済みなら許可
    authorized({ auth }) {
      return !!auth?.user;
    },
  },
});
