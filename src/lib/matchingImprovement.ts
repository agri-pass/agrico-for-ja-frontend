import { FarmlandFeature } from "@/features/farmland-map/types/farmland.types";
import {
  OwnedFarmlandCSV,
  normalizeText,
  normalizeChiban,
} from "@/features/farmland-map/lib/dataMatching";

// より柔軟なマッチングルール
export interface FlexibleMatchingOptions {
  allowPartialChiban: boolean; // 地番の部分マッチを許可
  allowSimilarKoaza: boolean; // 小字の類似マッチを許可
  allowMissingOaza: boolean; // 大字なしでもマッチを許可
  similarityThreshold: number; // 類似度の閾値 (0-1)
}

// デフォルトオプション
export const DEFAULT_MATCHING_OPTIONS: FlexibleMatchingOptions = {
  allowPartialChiban: true,
  allowSimilarKoaza: true,
  allowMissingOaza: false,
  similarityThreshold: 0.8,
};

// 文字列の類似度計算（レーベンシュタイン距離）
export function calculateSimilarity(str1: string, str2: string): number {
  const matrix = Array(str2.length + 1)
    .fill(null)
    .map(() => Array(str1.length + 1).fill(null));

  for (let i = 0; i <= str1.length; i++) {
    matrix[0][i] = i;
  }

  for (let j = 0; j <= str2.length; j++) {
    matrix[j][0] = j;
  }

  for (let j = 1; j <= str2.length; j++) {
    for (let i = 1; i <= str1.length; i++) {
      if (str1[i - 1] === str2[j - 1]) {
        matrix[j][i] = matrix[j - 1][i - 1];
      } else {
        matrix[j][i] = Math.min(
          matrix[j - 1][i - 1] + 1,
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1
        );
      }
    }
  }

  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0
    ? 1
    : (maxLength - matrix[str2.length][str1.length]) / maxLength;
}

// 改善されたマッチング関数
export function improvedMatchFarmland(
  feature: FarmlandFeature,
  csvData: OwnedFarmlandCSV,
  options: FlexibleMatchingOptions = DEFAULT_MATCHING_OPTIONS
): { isMatch: boolean; score: number; reasons: string[] } {
  const address = normalizeText(feature.properties.Address);
  const tiban = feature.properties.Tiban;
  const reasons: string[] = [];
  let score = 0;

  // 1. 地番マッチング
  const csvChiban = normalizeChiban(
    csvData.chiban + (csvData.edaban ? `-${csvData.edaban}` : "")
  );
  const geoChiban = normalizeChiban(tiban);

  if (csvChiban.full === geoChiban.full) {
    score += 40;
    reasons.push("地番完全一致");
  } else if (csvChiban.base === geoChiban.base) {
    score += 30;
    reasons.push("地番基本部分一致");
  } else if (options.allowPartialChiban) {
    const similarity = calculateSimilarity(csvChiban.full, geoChiban.full);
    if (similarity > 0.7) {
      score += 20 * similarity;
      reasons.push(`地番類似 (${(similarity * 100).toFixed(1)}%)`);
    }
  }

  // 2. 大字マッチング
  const normalizedOaza = normalizeText(csvData.oaza);
  if (address.includes(normalizedOaza)) {
    score += 30;
    reasons.push("大字一致");
  } else if (options.allowMissingOaza) {
    score += 10;
    reasons.push("大字なしでも許可");
  }

  // 3. 小字マッチング
  const normalizedKoaza = normalizeText(csvData.koaza);
  if (address.includes(normalizedKoaza)) {
    score += 30;
    reasons.push("小字一致");
  } else if (options.allowSimilarKoaza) {
    // 住所から小字らしき部分を抽出
    const koazaMatch = address.match(/字([^0-9]+)/);
    if (koazaMatch) {
      const extractedKoaza = normalizeText(koazaMatch[1]);
      const similarity = calculateSimilarity(normalizedKoaza, extractedKoaza);
      if (similarity > options.similarityThreshold) {
        score += 20 * similarity;
        reasons.push(`小字類似 (${(similarity * 100).toFixed(1)}%)`);
      }
    }
  }

  const isMatch = score >= 50; // 50点以上でマッチとする
  return { isMatch, score, reasons };
}

// バッチ改善マッチング
export function improvedBatchMatching(
  features: FarmlandFeature[],
  csvData: OwnedFarmlandCSV[],
  options: FlexibleMatchingOptions = DEFAULT_MATCHING_OPTIONS
) {
  const results: Array<{
    csvData: OwnedFarmlandCSV;
    feature?: FarmlandFeature;
    score: number;
    reasons: string[];
  }> = [];

  const usedFeatureIds = new Set<string>();

  for (const csv of csvData) {
    let bestMatch: {
      feature: FarmlandFeature;
      score: number;
      reasons: string[];
    } | null = null;

    for (const feature of features) {
      if (usedFeatureIds.has(feature.properties.DaichoId)) continue;

      const matchResult = improvedMatchFarmland(feature, csv, options);

      if (
        matchResult.isMatch &&
        (!bestMatch || matchResult.score > bestMatch.score)
      ) {
        bestMatch = {
          feature,
          score: matchResult.score,
          reasons: matchResult.reasons,
        };
      }
    }

    if (bestMatch) {
      usedFeatureIds.add(bestMatch.feature.properties.DaichoId);
      results.push({
        csvData: csv,
        feature: bestMatch.feature,
        score: bestMatch.score,
        reasons: bestMatch.reasons,
      });
    } else {
      results.push({
        csvData: csv,
        score: 0,
        reasons: ["マッチなし"],
      });
    }
  }

  const matchedCount = results.filter((r) => r.feature).length;
  const matchRate = (matchedCount / csvData.length) * 100;

  return {
    results,
    statistics: {
      totalCSV: csvData.length,
      matchedCount,
      matchRate,
    },
  };
}

// 手動マッチング用の候補検索
export function findMatchingCandidates(
  csv: OwnedFarmlandCSV,
  features: FarmlandFeature[],
  maxCandidates: number = 10
): Array<{
  feature: FarmlandFeature;
  score: number;
  reasons: string[];
}> {
  const candidates: Array<{
    feature: FarmlandFeature;
    score: number;
    reasons: string[];
  }> = [];

  for (const feature of features) {
    const matchResult = improvedMatchFarmland(feature, csv, {
      ...DEFAULT_MATCHING_OPTIONS,
      allowPartialChiban: true,
      allowSimilarKoaza: true,
      allowMissingOaza: true,
      similarityThreshold: 0.5,
    });

    if (matchResult.score > 0) {
      candidates.push({
        feature,
        score: matchResult.score,
        reasons: matchResult.reasons,
      });
    }
  }

  return candidates.sort((a, b) => b.score - a.score).slice(0, maxCandidates);
}

// マッチング結果の型定義
interface MatchingResult {
  csvData: OwnedFarmlandCSV;
  feature?: FarmlandFeature;
  score: number;
  reasons: string[];
}

// マッチング結果の詳細分析
export function analyzeMatchingResults(results: MatchingResult[]) {
  const scoreDistribution = {
    perfect: 0, // 90-100点
    high: 0, // 70-89点
    medium: 0, // 50-69点
    low: 0, // 1-49点
  };

  const reasonCounts: Record<string, number> = {};

  for (const result of results) {
    if (result.feature) {
      if (result.score >= 90) scoreDistribution.perfect++;
      else if (result.score >= 70) scoreDistribution.high++;
      else if (result.score >= 50) scoreDistribution.medium++;
      else scoreDistribution.low++;

      for (const reason of result.reasons) {
        reasonCounts[reason] = (reasonCounts[reason] || 0) + 1;
      }
    }
  }

  return {
    scoreDistribution,
    reasonCounts,
  };
}
