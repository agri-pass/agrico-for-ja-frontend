import { FarmlandFeature } from '@/types';
import { OwnedFarmlandCSV, matchFarmlandWithCSV } from './dataMatching';

export interface UnifiedMatchingResult {
  matchingResults: Map<string, OwnedFarmlandCSV>;
  statistics: {
    totalFeatures: number;
    totalCSV: number;
    matchedFeatures: number;
    uniqueCSVMatches: number;
    matchRate: number;
  };
  matched: Array<{ feature: FarmlandFeature; csvData: OwnedFarmlandCSV }>;
  unmatched: FarmlandFeature[];
  unmatchedCSV: OwnedFarmlandCSV[];
}

// 統一されたマッチング処理
export function performUnifiedMatching(
  features: FarmlandFeature[],
  csvData: OwnedFarmlandCSV[]
): UnifiedMatchingResult {
  const matchingResults = new Map<string, OwnedFarmlandCSV>();
  const usedCSVRecords = new Set<string>();
  let matchCount = 0;
  const matched: Array<{ feature: FarmlandFeature; csvData: OwnedFarmlandCSV }> = [];
  const unmatched: FarmlandFeature[] = [];

  // 各GeoJSONデータに対してマッチング処理
  for (const feature of features) {
    const matchedCSV = matchFarmlandWithCSV(feature, csvData);
    if (matchedCSV) {
      const csvKey = createCSVKey(matchedCSV);
      
      // まだ使用されていないCSVレコードの場合のみマッチングを認める
      if (!usedCSVRecords.has(csvKey)) {
        matchingResults.set(feature.properties.DaichoId, matchedCSV);
        usedCSVRecords.add(csvKey);
        matchCount++;
        matched.push({ feature, csvData: matchedCSV });
      } else {
        unmatched.push(feature);
      }
    } else {
      unmatched.push(feature);
    }
  }

  // 未マッチCSVデータを特定
  const unmatchedCSV = csvData.filter(csv => {
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
      matchRate: (uniqueCSVMatches / csvData.length) * 100
    },
    matched,
    unmatched,
    unmatchedCSV
  };
}

// CSVレコードのユニークキーを生成
function createCSVKey(csv: OwnedFarmlandCSV): string {
  return `${csv.organizationName}-${csv.oaza}-${csv.koaza}-${csv.chiban}-${csv.edaban || ''}`;
}

// ユニークなCSVマッチ数を計算（統計用）
export function calculateUniqueCSVMatches(matchingResults: Map<string, OwnedFarmlandCSV>): number {
  const uniqueCSVKeys = new Set<string>();
  for (const csvData of matchingResults.values()) {
    const csvKey = createCSVKey(csvData);
    uniqueCSVKeys.add(csvKey);
  }
  return uniqueCSVKeys.size;
}