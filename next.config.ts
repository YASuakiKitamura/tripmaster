import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Docker等での自前ホスト向けに、最小の自己完結サーバを出力する
  output: "standalone",
};

export default nextConfig;
