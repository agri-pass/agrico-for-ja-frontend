import { FarmlandFeature, FarmlandCollection } from "@/types";
import {
  OwnedFarmlandCSV,
  parseOwnedFarmlandCSV,
} from "@/lib/dataMatching";
import { 
  performUnifiedMatching, 
  calculateUniqueCSVMatches,
  UnifiedMatchingResult 
} from "@/lib/matchingService";

// メモリ内データストア
export class DataService {
  private farmlandFeatures: FarmlandFeature[] = [];
  private ownedFarmlandCSV: OwnedFarmlandCSV[] = [];
  private matchingResults: Map<string, OwnedFarmlandCSV> = new Map();

  // GeoJSONデータの読み込み
  async loadGeoJSON(path: string = "/data/pin.geojson"): Promise<void> {
    try {
      const response = await fetch(path);
      const data: FarmlandCollection = await response.json();
      this.farmlandFeatures = data.features;
      console.log(`Loaded ${this.farmlandFeatures.length} farmland features`);

      // マッチング処理を実行
      this.performMatching();
    } catch (error) {
      console.error("Failed to load GeoJSON:", error);
      throw error;
    }
  }

  // CSVデータの読み込み
  async loadCSV(path: string = "/data/ex_owned_farmland.csv"): Promise<void> {
    try {
      const response = await fetch(path);
      const csvText = await response.text();
      this.ownedFarmlandCSV = parseOwnedFarmlandCSV(csvText);
      console.log(
        `Loaded ${this.ownedFarmlandCSV.length} owned farmland records`
      );

      // マッチング処理を実行
      this.performMatching();
    } catch (error) {
      console.error("Failed to load CSV:", error);
      throw error;
    }
  }

  // マッチング処理（統一されたロジックを使用）
  private performMatching(): void {
    if (
      this.farmlandFeatures.length === 0 ||
      this.ownedFarmlandCSV.length === 0
    ) {
      return;
    }

    const result = performUnifiedMatching(this.farmlandFeatures, this.ownedFarmlandCSV);
    this.matchingResults = result.matchingResults;

    console.log(
      `Matching complete: ${result.statistics.matchedFeatures} GeoJSON features matched`
    );
    console.log(
      `Unique CSV matches: ${result.statistics.uniqueCSVMatches}/${result.statistics.totalCSV}`
    );
    console.log(
      `Match rate: ${result.statistics.matchRate.toFixed(1)}%`
    );
  }

  // 農地データの取得（集落営農法人フラグ付き）
  getFarmlandsWithOwnership(): Array<
    FarmlandFeature & { isCollectiveOwned: boolean }
  > {
    return this.farmlandFeatures.map((feature) => ({
      ...feature,
      isCollectiveOwned: this.matchingResults.has(feature.properties.DaichoId),
    }));
  }

  // 集落営農法人の農地のみ取得
  getCollectiveFarmlands(): FarmlandFeature[] {
    return this.farmlandFeatures.filter((feature) =>
      this.matchingResults.has(feature.properties.DaichoId)
    );
  }

  // 個人農地のみ取得
  getIndividualFarmlands(): FarmlandFeature[] {
    return this.farmlandFeatures.filter(
      (feature) => !this.matchingResults.has(feature.properties.DaichoId)
    );
  }

  // 統計情報の取得
  getStatistics() {
    const total = this.farmlandFeatures.length;
    const collectiveCount = this.matchingResults.size;
    const individualCount = total - collectiveCount;

    // 面積計算
    let collectiveArea = 0;
    let individualArea = 0;

    for (const feature of this.farmlandFeatures) {
      const area = parseInt(feature.properties.AreaOnRegistry) || 0;
      if (this.matchingResults.has(feature.properties.DaichoId)) {
        collectiveArea += area;
      } else {
        individualArea += area;
      }
    }

    // 実際にマッチしたユニークなCSVレコード数を計算
    const uniqueCSVMatches = calculateUniqueCSVMatches(this.matchingResults);

    return {
      total,
      collective: {
        count: collectiveCount,
        area: collectiveArea,
        percentage: (collectiveCount / total) * 100,
      },
      individual: {
        count: individualCount,
        area: individualArea,
        percentage: (individualCount / total) * 100,
      },
      csvRecords: this.ownedFarmlandCSV.length,
      matchRate: (uniqueCSVMatches / this.ownedFarmlandCSV.length) * 100,
    };
  }

  // 特定の農地の詳細情報取得
  getFarmlandDetails(daichoId: string) {
    const feature = this.farmlandFeatures.find(
      (f) => f.properties.DaichoId === daichoId
    );
    if (!feature) return null;

    const ownershipInfo = this.matchingResults.get(daichoId);

    return {
      feature,
      isCollectiveOwned: !!ownershipInfo,
      ownershipInfo,
    };
  }

  // 特定の農地の組織別色を取得
  getFarmlandColor(daichoId: string): string {
    const matchedCSV = this.matchingResults.get(daichoId);
    if (!matchedCSV) {
      return "#4ECDC4"; // デフォルト色（その他農地）
    }

    // 組織別の色を取得
    const organizationColors = [
      "#0066CC", "#FF6600", "#9966CC", "#FF9900",
      "#CC0066", "#00CCAA", "#6633FF", "#FF3366"
    ];

    const organizations = new Set<string>();
    for (const csvData of this.matchingResults.values()) {
      organizations.add(csvData.organizationName);
    }

    let colorIndex = 0;
    for (const org of organizations) {
      if (org === matchedCSV.organizationName) {
        return organizationColors[colorIndex % organizationColors.length];
      }
      colorIndex++;
    }

    return "#FF0000"; // フォールバック色
  }

  // 集落営農組織別の色マッピング
  getFarmerColorMap(): Map<string, string> {
    const colorMap = new Map<string, string>();
    const defaultColor = "#4ECDC4"; // 青緑色：その他の農地
    
    // 組織別の色パレット
    const organizationColors = [
      "#0066CC", // 青色
      "#FF6600", // オレンジ色
      "#9966CC", // 紫色
      "#FF9900", // 黄色
      "#CC0066", // ピンク色
      "#00CCAA", // ティール色
      "#6633FF", // 濃い紫色
      "#FF3366", // コーラル色
    ];

    // すべての耕作者ハッシュに対してデフォルト色を設定
    const farmerHashes = new Set(
      this.farmlandFeatures.map((f) => f.properties.FarmerIndicationNumberHash)
    );

    for (const hash of farmerHashes) {
      colorMap.set(hash, defaultColor);
    }

    // 組織名別に色を割り当て
    const organizations = new Set<string>();
    for (const csvData of this.matchingResults.values()) {
      organizations.add(csvData.organizationName);
    }

    const organizationColorMap = new Map<string, string>();
    let colorIndex = 0;
    for (const org of organizations) {
      organizationColorMap.set(org, organizationColors[colorIndex % organizationColors.length]);
      colorIndex++;
    }

    // マッチした農地に組織別の色を適用
    for (const feature of this.farmlandFeatures) {
      const matchedCSV = this.matchingResults.get(feature.properties.DaichoId);
      if (matchedCSV) {
        const orgColor = organizationColorMap.get(matchedCSV.organizationName);
        if (orgColor) {
          colorMap.set(feature.properties.FarmerIndicationNumberHash, orgColor);
        }
      }
    }

    return colorMap;
  }

  // 組織別の統計情報を取得
  getOrganizationStatistics() {
    const orgStats = new Map<string, {
      count: number;
      area: number;
      color: string;
    }>();

    const organizationColors = [
      "#0066CC", "#FF6600", "#9966CC", "#FF9900", 
      "#CC0066", "#00CCAA", "#6633FF", "#FF3366"
    ];

    const organizations = new Set<string>();
    for (const csvData of this.matchingResults.values()) {
      organizations.add(csvData.organizationName);
    }

    // 組織別に色を割り当て
    let colorIndex = 0;
    for (const org of organizations) {
      orgStats.set(org, {
        count: 0,
        area: 0,
        color: organizationColors[colorIndex % organizationColors.length]
      });
      colorIndex++;
    }

    // 各農地を組織別に集計
    for (const feature of this.farmlandFeatures) {
      const matchedCSV = this.matchingResults.get(feature.properties.DaichoId);
      if (matchedCSV) {
        const stats = orgStats.get(matchedCSV.organizationName);
        if (stats) {
          stats.count++;
          stats.area += parseInt(feature.properties.AreaOnRegistry) || 0;
        }
      }
    }

    return Array.from(orgStats.entries()).map(([name, stats]) => ({
      organizationName: name,
      ...stats
    }));
  }
}

// シングルトンインスタンス
export const dataService = new DataService();
