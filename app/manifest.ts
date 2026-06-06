import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PP添乗員 — 旅の作戦ガイド",
    short_name: "PP添乗員",
    description:
      "旅程・店・決済・緊急・トイレ・天気をスマホ1つに。AIが次の行動を案内し、予定変更も組み直す旅行ガイド。",
    start_url: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0047a0",
    lang: "ja",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      {
        src: "/apple-icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
