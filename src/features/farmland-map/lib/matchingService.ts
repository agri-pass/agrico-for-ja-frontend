import { FarmlandFeature } from "../types/farmland.types";
import { OwnedFarmlandCSV, matchFarmlandWithCSV } from "./dataMatching";

export interface UnifiedMatchingResult {
  matchingResults: Map<string, OwnedFarmlandCSV[]>; // 複数のCSVレコードを保持
  statistics: {
    totalFeatures: number;
    totalCSV: number;
    matchedFeatures: number;
    uniqueCSVMatches: number;
    matchRate: number;
  };
  matched: Array<{ feature: FarmlandFeature; csvData: OwnedFarmlandCSV[] }>;
  unmatched: FarmlandFeature[];
  unmatchedCSV: OwnedFarmlandCSV[];
}

// 統一されたマッチング処理（一つの農地に複数のCSVレコードをマッチ）
export function performUnifiedMatching(
  features: FarmlandFeature[],
  csvData: OwnedFarmlandCSV[]
): UnifiedMatchingResult {
  const matchingResults = new Map<string, OwnedFarmlandCSV[]>();
  const usedCSVRecords = new Set<string>();
  let matchCount = 0;
  const matched: Array<{
    feature: FarmlandFeature;
    csvData: OwnedFarmlandCSV[];
  }> = [];
  const unmatched: FarmlandFeature[] = [];

  // 各GeoJSONデータに対してマッチング処理
  for (const feature of features) {
    // この農地にマッチするすべてのCSVレコードを取得
    const matchedCSVList: OwnedFarmlandCSV[] = [];

    for (const csv of csvData) {
      // マッチング判定（matchFarmlandWithCSVの内部ロジックを使用）
      const testMatched = matchFarmlandWithCSV(feature, [csv]);
      if (testMatched) {
        const csvKey = createCSVKey(csv);
        if (!usedCSVRecords.has(csvKey)) {
          matchedCSVList.push(csv);
          usedCSVRecords.add(csvKey);
        }
      }
    }

    if (matchedCSVList.length > 0) {
      matchingResults.set(feature.properties.DaichoId, matchedCSVList);
      matchCount++;
      matched.push({ feature, csvData: matchedCSVList });
    } else {
      unmatched.push(feature);
    }
  }

  // 未マッチCSVデータを特定
  const unmatchedCSV = csvData.filter((csv) => {
    const csvKey = createCSVKey(csv);
    return !usedCSVRecords.has(csvKey);
  });

  const uniqueCSVMatches = usedCSVRecords.size;

  return {
    matchingResults,
    statistics: {
      totalFeatures: features.length,
      totalCSV: csvData.length,
      matchedFeatures: matchCount,
      uniqueCSVMatches,
      matchRate: (uniqueCSVMatches / csvData.length) * 100,
    },
    matched,
    unmatched,
    unmatchedCSV,
  };
}

// CSVレコードのユニークキーを生成（作期を含める）
function createCSVKey(csv: OwnedFarmlandCSV): string {
  return `${csv.organizationName}-${csv.oaza}-${csv.koaza}-${csv.chiban}-${
    csv.edaban || ""
  }-${csv.sakki || ""}`;
}

// ユニークなCSVマッチ数を計算（統計用）
export function calculateUniqueCSVMatches(
  matchingResults: Map<string, OwnedFarmlandCSV[]>
): number {
  const uniqueCSVKeys = new Set<string>();
  for (const csvList of Array.from(matchingResults.values())) {
    for (const csvData of csvList) {
      const csvKey = createCSVKey(csvData);
      uniqueCSVKeys.add(csvKey);
    }
  }
  return uniqueCSVKeys.size;
}
