// 旅データ JSON（app/data/trips/<id>.json）を CRUD するサーバー専用ヘルパ。
// fs を直接触るので Node ランタイム・サーバー側からのみ import 可（クライアントには載らない）。
//
// ⚠️ 書き込みは「書き込み可能なFS」でのみ動作する。本番 Vercel はサーバーレスで
//    ファイルシステムが読み取り専用 + 旅JSONはビルド時 import のため、書き込み不可（閲覧のみ）。
//    ローカル開発(npm run dev) / Docker 自前ホストで使うことを想定。
//
// create/delete では trips.ts と resolveTrip.ts の登録も自動で書き換える（国内＝姫路型のみ）。
// 書き換え位置は両ファイルの `// ADMIN:...-END` マーカーをアンカーにする。
import { promises as fs } from "fs";
import path from "path";
import { trips, type TripMeta } from "./trips";

const ROOT = process.cwd();
const TRIPS_DIR = path.join(ROOT, "app", "data", "trips");
const TRIPS_TS = path.join(ROOT, "app", "lib", "trips.ts");
const RESOLVE_TS = path.join(ROOT, "app", "lib", "resolveTrip.ts");

/** 本番(Vercel)等の読み取り専用FSでは書き込みを無効化する。 */
export function writesEnabled(): boolean {
  return !process.env.VERCEL;
}

const ID_RE = /^[a-z0-9][a-z0-9-]*$/;
/** id は英小文字・数字・ハイフンのみ（ファイル名/識別子に安全な範囲）。 */
export function validId(id: string): boolean {
  return ID_RE.test(id) && id.length <= 64;
}

/** id → resolveTrip.ts で使う import 変数名（ハイフン等を _ に）。 */
function varName(id: string): string {
  return `trip_${id.replace(/[^a-z0-9]/g, "_")}Raw`;
}

function filePath(id: string): string {
  return path.join(TRIPS_DIR, `${id}.json`);
}

export interface TripFileInfo {
  id: string;
  hasFile: boolean; // JSON ファイルが存在するか
  registered: boolean; // trips.ts にエントリがあるか
  managed: boolean; // /admin が作った（コードを安全に削除できる）旅か
  meta?: TripMeta;
}

/** ファイルとレジストリの両方を突き合わせて一覧化する。 */
export async function listTrips(): Promise<TripFileInfo[]> {
  let files: string[] = [];
  try {
    files = (await fs.readdir(TRIPS_DIR)).filter((f) => f.endsWith(".json"));
  } catch {
    files = [];
  }
  const fileIds = files.map((f) => f.replace(/\.json$/, ""));
  let resolveSrc = "";
  try {
    resolveSrc = await fs.readFile(RESOLVE_TS, "utf8");
  } catch {
    resolveSrc = "";
  }

  const ids = new Set<string>([...fileIds, ...trips.map((t) => t.id)]);
  return [...ids].sort().map((id) => ({
    id,
    hasFile: fileIds.includes(id),
    registered: trips.some((t) => t.id === id),
    managed: resolveSrc.includes(varName(id)),
    meta: trips.find((t) => t.id === id),
  }));
}

/** 生の JSON テキストを返す（編集UI用）。無ければ null。 */
export async function readTrip(id: string): Promise<string | null> {
  if (!validId(id)) return null;
  try {
    return await fs.readFile(filePath(id), "utf8");
  } catch {
    return null;
  }
}

/** JSON を検証→整形して書き込む。不正な JSON は例外。 */
export async function writeTrip(id: string, json: string): Promise<void> {
  const parsed = JSON.parse(json);
  await fs.writeFile(filePath(id), JSON.stringify(parsed, null, 2) + "\n", "utf8");
}

async function fileExists(id: string): Promise<boolean> {
  try {
    await fs.access(filePath(id));
    return true;
  } catch {
    return false;
  }
}

// ---- TS レジストリの書き換え ----

/** marker 行の直前に snippet を挿入。dedupeKey が既出なら何もしない（冪等）。 */
async function insertBeforeMarker(
  file: string,
  marker: string,
  snippet: string,
  dedupeKey: string,
): Promise<void> {
  const src = await fs.readFile(file, "utf8");
  if (src.includes(dedupeKey)) return;
  const idx = src.indexOf(marker);
  if (idx === -1) throw new Error(`挿入マーカーが見つかりません: ${marker}（${path.basename(file)}）`);
  const lineStart = src.lastIndexOf("\n", idx) + 1;
  const next = src.slice(0, lineStart) + snippet + src.slice(lineStart);
  await fs.writeFile(file, next, "utf8");
}

/** 国内旅(姫路型)を trips.ts と resolveTrip.ts に登録する。 */
export async function registerDomestic(meta: TripMeta): Promise<void> {
  const entry =
    `  {\n` +
    `    id: ${JSON.stringify(meta.id)},\n` +
    `    name: ${JSON.stringify(meta.name)},\n` +
    `    destination: ${JSON.stringify(meta.destination)},\n` +
    `    emoji: ${JSON.stringify(meta.emoji)},\n` +
    `    dateLabel: ${JSON.stringify(meta.dateLabel)},\n` +
    `    status: ${JSON.stringify(meta.status)},\n` +
    (meta.teaser ? `    teaser: ${JSON.stringify(meta.teaser)},\n` : "") +
    `  },\n`;
  await insertBeforeMarker(
    TRIPS_TS,
    "// ADMIN:TRIPS-END",
    entry,
    `id: ${JSON.stringify(meta.id)},`,
  );

  const v = varName(meta.id);
  await insertBeforeMarker(
    RESOLVE_TS,
    "// ADMIN:IMPORTS-END",
    `import ${v} from "@/app/data/trips/${meta.id}.json";\n`,
    `@/app/data/trips/${meta.id}.json"`,
  );
  await insertBeforeMarker(
    RESOLVE_TS,
    "// ADMIN:DOMESTIC-END",
    `  ${JSON.stringify(meta.id)}: ${v} as unknown as HimejiData,\n`,
    `${v} as unknown as HimejiData`,
  );
}

/** trips.ts から id のエントリ（{ ... } ブロック）を1つ削除。 */
async function removeTripEntry(id: string): Promise<void> {
  const src = await fs.readFile(TRIPS_TS, "utf8");
  const lines = src.split("\n");
  const idLine = lines.findIndex((l) => l.includes(`id: ${JSON.stringify(id)},`));
  if (idLine === -1) return;
  let start = idLine;
  while (start >= 0 && lines[start].trim() !== "{") start--;
  let end = idLine;
  while (end < lines.length && lines[end].trim() !== "},") end++;
  if (start < 0 || end >= lines.length) return;
  lines.splice(start, end - start + 1);
  await fs.writeFile(TRIPS_TS, lines.join("\n"), "utf8");
}

/** ファイル + trips.ts/resolveTrip.ts の登録を削除（/admin が作った旅のみ）。 */
export async function deleteTrip(id: string): Promise<void> {
  await fs.rm(filePath(id), { force: true });
  await removeTripEntry(id);
  const v = varName(id);
  const src = await fs.readFile(RESOLVE_TS, "utf8");
  const kept = src.split("\n").filter((l) => !l.includes(v));
  await fs.writeFile(RESOLVE_TS, kept.join("\n"), "utf8");
}

export interface CreateInput {
  id: string;
  name: string;
  destination: string;
  emoji: string;
  dateLabel: string;
  teaser?: string;
  status?: TripMeta["status"];
}

/** 新規国内旅: 雛形JSONを書き、trips.ts/resolveTrip.ts に登録する。 */
export async function createDomestic(input: CreateInput): Promise<TripMeta> {
  if (!validId(input.id)) {
    throw new Error("id は英小文字・数字・ハイフンのみ（例: kyoto-2027）");
  }
  if (await fileExists(input.id)) {
    throw new Error(`${input.id}.json は既に存在します`);
  }
  const meta: TripMeta = {
    id: input.id,
    name: input.name || input.id,
    destination: input.destination || input.name || input.id,
    emoji: input.emoji || "🧳",
    dateLabel: input.dateLabel || "",
    status: input.status ?? "coming-soon",
    teaser: input.teaser || undefined,
  };
  await writeTrip(input.id, JSON.stringify(domesticTemplate(meta)));
  await registerDomestic(meta);
  return meta;
}

/** resolveDomestic が読める最小構成の姫路型スキーマ雛形。 */
function domesticTemplate(meta: TripMeta) {
  return {
    trip: {
      title: meta.name,
      startDate: "",
      endDate: "",
      dayOfWeek: "",
      summary: "（概要を記入）",
      travelers: [
        { name: "靖晃", note: "" },
        { name: "ひとみ", note: "" },
      ],
    },
    transport: {
      outbound: {
        name: "（往路便名）",
        type: "飛行機",
        departure: { station: "羽田空港", time: "00:00", date: "" },
        arrival: { station: "（到着地）", time: "00:00", date: "" },
        seat: "",
        notes: "",
      },
      return: {
        name: "（復路便名）",
        type: "飛行機",
        departure: { station: "（出発地）", time: "00:00", date: "" },
        arrival: { station: "羽田空港", time: "00:00", date: "" },
        seat: "",
        isLast: true,
        notes: "",
      },
    },
    lodging: {
      name: "（宿名）",
      area: "（住所）",
      checkIn: "15:00",
      checkOut: "10:00",
      notes: "",
    },
    itinerary: [],
    stores: [],
    payment: {
      strategy: "（決済方針を記入）",
      ic: { role: "在来線・バス・コンビニ", note: "" },
      card: { role: "ホテル・新幹線・大型店", note: "" },
      cash: { role: "個人店・寺社", note: "" },
    },
    emergency: {
      lastTrain: { name: "（復路便）", departure: "00:00", note: "" },
      safetyNets: [],
      ifMissed: { plan: "（乗り遅れ時のプラン）" },
      contacts: [],
    },
    tips: [],
    _confirm: ["（要確認事項を記入）"],
    extras: {
      initialCash: 20000,
      reminders: [],
      apps: [
        {
          label: "Googleマップ",
          emoji: "🗺",
          url: "https://www.google.com/maps",
          note: "ナビ・店検索",
        },
      ],
      toilets: [],
      weather: [],
    },
  };
}
