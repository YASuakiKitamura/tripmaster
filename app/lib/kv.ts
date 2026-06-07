// 旅程オーバーレイの共有保存先（2台のスマホで同じ編集を見るため）。
// Upstash Redis（Vercel Marketplace 統合）を使う。サーバ側専用。
// 未設定なら null を返し、呼び出し側は localStorage のみで動作する（段階導入可）。
import { Redis } from "@upstash/redis";

let client: Redis | null | undefined;

function getRedis(): Redis | null {
  if (client !== undefined) return client;
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  client = url && token ? new Redis({ url, token }) : null;
  return client;
}

export function kvConfigured(): boolean {
  return getRedis() !== null;
}

const key = (tripId: string) => `trip-patch:${tripId}`;

export async function kvGet<T>(tripId: string): Promise<T | null> {
  const redis = getRedis();
  if (!redis) return null;
  return (await redis.get<T>(key(tripId))) ?? null;
}

export async function kvSet<T>(tripId: string, value: T): Promise<void> {
  const redis = getRedis();
  if (!redis) return;
  await redis.set(key(tripId), value);
}
