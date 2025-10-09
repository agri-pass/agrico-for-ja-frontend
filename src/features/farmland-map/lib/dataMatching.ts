import { FarmlandFeature } from "../types/farmland.types";

// CSVデータの型定義
export interface OwnedFarmlandCSV {
  organizationName: string; // 集落営農組織名
  fullAddress: string; // 地名地番（漢字）
  oaza: string; // 大字
  koaza: string; // 小字
  chiban: string; // 地番
  edaban?: string; // 枝番
  bunkatsu1?: string; // 分割1
  bunkatsu2?: string; // 分割2
}

// CSVデータのパース
export function parseOwnedFarmlandCSV(csvText: string): OwnedFarmlandCSV[] {
  const lines = csvText.split("\n");
  const result: OwnedFarmlandCSV[] = [];

  // ヘッダー行をスキップ（1行目）
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split(",");
    if (parts.length < 5) continue; // 最低5列必要（組織名,地名地番,大字,小字,地番）

    result.push({
      organizationName: parts[0], // 集落営農組織名
      fullAddress: parts[1], // 地名地番（漢字）
      oaza: parts[2], // 大字
      koaza: parts[3], // 小字
      chiban: parts[4], // 地番
      edaban: parts[5] || undefined, // 枝番
      bunkatsu1: parts[6] || undefined, // 分割1
      bunkatsu2: parts[7] || undefined, // 分割2
    });
  }

  return result;
}

// 表記ゆれの正規化
export function normalizeText(text: string): string {
  return text
    .replace(/ノ/g, "の")
    .replace(/ケ/g, "ヶ")
    .replace(/ッ/g, "っ")
    .replace(/ヅ/g, "づ")
    .replace(/　/g, " ")
    .replace(/大字/g, "");
}

// 地番の正規化（枝番を考慮）
export function normalizeChiban(chiban: string): {
  base: string;
  full: string;
} {
  const match = chiban.match(/^(\d+)(.*)$/);
  if (match) {
    return {
      base: match[1], // 基本番号
      full: chiban, // 完全な地番
    };
  }
  return { base: chiban, full: chiban };
}

// マッチング関数
export function matchFarmlandWithCSV(
  feature: FarmlandFeature,
  csvData: OwnedFarmlandCSV[]
): OwnedFarmlandCSV | null {
  const address = normalizeText(feature.properties.Address);
  const tiban = feature.properties.Tiban;

  for (const csv of csvData) {
    // 地番の比較
    const csvChiban = normalizeChiban(
      csv.chiban + (csv.edaban ? `-${csv.edaban}` : "")
    );
    const geoChiban = normalizeChiban(tiban);

    // 地番完全一致チェック（最優先）
    if (csvChiban.full === geoChiban.full) {
      // 大字・小字の確認（部分一致）
      const normalizedOaza = normalizeText(csv.oaza);
      const normalizedKoaza = normalizeText(csv.koaza);

      // 大字・小字が含まれているかチェック
      if (
        address.includes(normalizedOaza) ||
        address.includes(normalizedKoaza)
      ) {
        return csv;
      }
    }
  }

  return null;
}

// マッチング結果の型
export interface MatchingResult {
  matched: Array<{
    feature: FarmlandFeature;
    csvData: OwnedFarmlandCSV;
  }>;
  unmatched: FarmlandFeature[];
  unmatchedCSV: OwnedFarmlandCSV[];
  statistics: {
    totalFeatures: number;
    totalCSV: number;
    matchedCount: number;
    matchRate: number;
  };
}

// バッチマッチング処理
export function performBatchMatching(
  features: FarmlandFeature[],
  csvData: OwnedFarmlandCSV[]
): MatchingResult {
  const matched: Array<{
    feature: FarmlandFeature;
    csvData: OwnedFarmlandCSV;
  }> = [];
  const unmatched: FarmlandFeature[] = [];
  const matchedCSVIds = new Set<string>();

  for (const feature of features) {
    const matchedCSV = matchFarmlandWithCSV(feature, csvData);
    if (matchedCSV) {
      matched.push({ feature, csvData: matchedCSV });
      matchedCSVIds.add(matchedCSV.fullAddress);
    } else {
      unmatched.push(feature);
    }
  }

  const unmatchedCSV = csvData.filter(
    (csv) => !matchedCSVIds.has(csv.fullAddress)
  );

  return {
    matched,
    unmatched,
    unmatchedCSV,
    statistics: {
      totalFeatures: features.length,
      totalCSV: csvData.length,
      matchedCount: matched.length,
      matchRate: (matched.length / csvData.length) * 100,
    },
  };
}

// 集落営農法人の判定
export function isCollectiveFarmland(
  feature: FarmlandFeature,
  csvData: OwnedFarmlandCSV[]
): boolean {
  return matchFarmlandWithCSV(feature, csvData) !== null;
}

// デバッグ用：アドレス解析
export function analyzeAddress(address: string): {
  prefecture?: string;
  city?: string;
  town?: string;
  oaza?: string;
  koaza?: string;
  chiban?: string;
} {
  const result: {
    prefecture?: string;
    city?: string;
    town?: string;
    oaza?: string;
    koaza?: string;
    chiban?: string;
  } = {};

  // 都道府県
  const prefMatch = address.match(/^([^県]+県)/);
  if (prefMatch) result.prefecture = prefMatch[1];

  // 市
  const cityMatch = address.match(/([^市]+市)/);
  if (cityMatch) result.city = cityMatch[1];

  // 町
  const townMatch = address.match(/([^町]+町)/);
  if (townMatch) result.town = townMatch[1];

  // 字
  const azaMatch = address.match(/字([^0-9]+)/);
  if (azaMatch) result.koaza = azaMatch[1];

  // 地番
  const chibanMatch = address.match(/(\d+[-]?\d*[-]?\d*)$/);
  if (chibanMatch) result.chiban = chibanMatch[1];

  return result;
}
