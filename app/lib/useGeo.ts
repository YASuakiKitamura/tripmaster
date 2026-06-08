"use client";

import { useCallback, useState } from "react";

export interface Coords {
  lat: number;
  lon: number;
}
type GeoStatus = "idle" | "loading" | "ok" | "error" | "unsupported";

/** 端末GPSで現在地を取得するフック（ユーザ操作で request() を呼ぶ）。 */
export function useGeo() {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");

  const request = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unsupported");
      return;
    }
    setStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setCoords({ lat: p.coords.latitude, lon: p.coords.longitude });
        setStatus("ok");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 },
    );
  }, []);

  const clear = useCallback(() => {
    setCoords(null);
    setStatus("idle");
  }, []);

  return { coords, status, request, clear };
}

/** 2点間の概算直線距離(m)。Haversine。 */
export function distanceMeters(a: Coords, b: Coords): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** 距離(m)を「約650m・徒歩8分」風に整形（直線距離の概算、徒歩80m/分）。 */
export function formatDistance(m: number): string {
  const walk = Math.max(1, Math.round(m / 80));
  const dist = m < 1000 ? `約${Math.round(m / 10) * 10}m` : `約${(m / 1000).toFixed(1)}km`;
  return `${dist}・徒歩${walk}分`;
}
