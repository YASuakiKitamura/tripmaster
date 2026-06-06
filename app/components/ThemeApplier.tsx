"use client";

import { useEffect } from "react";
import { useTrip } from "../lib/useTrip";

/** 選択中の旅に応じて <html data-trip> とステータスバー色を切り替える */
export function ThemeApplier() {
  const [tripId] = useTrip();
  useEffect(() => {
    document.documentElement.dataset.trip = tripId;
    // モバイルのアドレスバー色を現在のアクセント色に追従
    const accent = getComputedStyle(document.documentElement)
      .getPropertyValue("--accent")
      .trim();
    if (accent) {
      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]',
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = accent;
    }
  }, [tripId]);
  return null;
}
