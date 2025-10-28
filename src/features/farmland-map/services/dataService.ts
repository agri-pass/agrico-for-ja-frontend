import {
  FarmlandFeature,
  FarmlandCollection,
  PolygonFeature,
  PolygonCollection,
  FarmlandWithPolygon,
} from "../types/farmland.types";
import { OwnedFarmlandCSV, parseOwnedFarmlandCSV } from "../lib/dataMatching";
import {
  performUnifiedMatching,
  calculateUniqueCSVMatches,
} from "../lib/matchingService";
import * as turf from "@turf/turf";

// メモリ内データストア
export class DataService {
  private farmlandFeatures: FarmlandFeature[] = [];
  private polygonFeatures: PolygonFeature[] = [];
  private ownedFarmlandCSV: OwnedFarmlandCSV[] = [];
  private matchingResults: Map<string, OwnedFarmlandCSV[]> = new Map(); // 複数のCSVレコードを保持
  private farmlandWithPolygons: FarmlandWithPolygon[] = [];

  // GeoJSONデータの読み込み
  async loadGeoJSON(
    path: string = "/data/hinashiro_pin.geojson"
  ): Promise<void> {
    try {
      console.log(`Loading GeoJSON from: ${path}`);
      const response = await fetch(path);

      // 大きなJSONの場合、段階的にパース
      const text = await response.text();
      const data: FarmlandCollection = JSON.parse(text);

      this.farmlandFeatures = data.features;
      console.log(`Loaded ${this.farmlandFeatures.length} farmland features`);

      // マッチング処理を実行
      this.performMatching();
      // 空間結合は遅延実行（必要に応じて呼び出す）
      // this.performSpatialJoin();
    } catch (error) {
      console.error("Failed to load GeoJSON:", error);
      throw error;
    }
  }

  // Polygonデータの読み込み
  async loadPolygons(
    path: string = "/data/hinashiro_polygon.geojson"
  ): Promise<void> {
    try {
      console.log(`Loading polygon data from: ${path}`);
      const response = await fetch(path);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const text = await response.text();
      // BOMを削除
      const cleanText = text.replace(/^\uFEFF/, "");
      const data: PolygonCollection = JSON.parse(cleanText);

      this.polygonFeatures = data.features;
      console.log(`Loaded ${this.polygonFeatures.length} polygon features`);

      // 空間結合は遅延実行（必要に応じて呼び出す）
      // this.performSpatialJoin();
    } catch (error) {
      console.error("Failed to load Polygon GeoJSON:", error);
      throw error;
    }
  }

  // CSVデータの読み込み
  async loadCSV(
    path: string = "/data/hinashiro_owned_farmland.csv"
  ): Promise<void> {
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

  // ファイルからGeoJSONデータを読み込み
  async loadGeoJSONFromFile(file: File): Promise<void> {
    try {
      console.log(`Loading GeoJSON from file: ${file.name}`);
      const text = await file.text();
      const data: FarmlandCollection = JSON.parse(text);

      this.farmlandFeatures = data.features;
      console.log(
        `Loaded ${this.farmlandFeatures.length} farmland features from file`
      );

      // マッチング処理を実行
      this.performMatching();
    } catch (error) {
      console.error("Failed to load GeoJSON from file:", error);
      throw error;
    }
  }

  // ファイルからPolygonデータを読み込み
  async loadPolygonsFromFile(file: File): Promise<void> {
    try {
      console.log(`Loading polygon data from file: ${file.name}`);
      const text = await file.text();
      // BOMを削除
      const cleanText = text.replace(/^\uFEFF/, "");
      const data: PolygonCollection = JSON.parse(cleanText);

      this.polygonFeatures = data.features;
      console.log(
        `Loaded ${this.polygonFeatures.length} polygon features from file`
      );
    } catch (error) {
      console.error("Failed to load Polygon GeoJSON from file:", error);
      throw error;
    }
  }

  // ファイルからCSVデータを読み込み
  async loadCSVFromFile(file: File): Promise<void> {
    try {
      console.log(`Loading CSV from file: ${file.name}`);
      const csvText = await file.text();
      this.ownedFarmlandCSV = parseOwnedFarmlandCSV(csvText);
      console.log(
        `Loaded ${this.ownedFarmlandCSV.length} owned farmland records from file`
      );

      // マッチング処理を実行
      this.performMatching();
    } catch (error) {
      console.error("Failed to load CSV from file:", error);
      throw error;
    }
  }

  // データのリセット（新しいファイルをアップロードする前にクリア）
  resetData(): void {
    this.farmlandFeatures = [];
    this.polygonFeatures = [];
    this.ownedFarmlandCSV = [];
    this.matchingResults = new Map();
    this.farmlandWithPolygons = [];
    console.log("Data reset completed");
  }

  // マッチング処理（統一されたロジックを使用）
  private performMatching(): void {
    if (
      this.farmlandFeatures.length === 0 ||
      this.ownedFarmlandCSV.length === 0
    ) {
      return;
    }

    const result = performUnifiedMatching(
      this.farmlandFeatures,
      this.ownedFarmlandCSV
    );
    this.matchingResults = result.matchingResults;

    console.log(
      `Matching complete: ${result.statistics.matchedFeatures} GeoJSON features matched`
    );
    console.log(
      `Unique CSV matches: ${result.statistics.uniqueCSVMatches}/${result.statistics.totalCSV}`
    );
    console.log(`Match rate: ${result.statistics.matchRate.toFixed(1)}%`);
  }

  // 空間結合処理（Turfを使用してpoint-in-polygon判定）
  private performSpatialJoin(): void {
    if (
      this.farmlandFeatures.length === 0 ||
      this.polygonFeatures.length === 0
    ) {
      return;
    }

    console.log("Starting spatial join with Turf...");

    // 各pinポイントに対してポリゴン内判定を実行
    this.farmlandWithPolygons = this.farmlandFeatures.map((farmland) => {
      const point = turf.point(farmland.geometry.coordinates);

      // すべてのポリゴンをチェックして、ポイントが含まれるポリゴンを探す
      let matchedPolygon: PolygonFeature | undefined;

      for (const polygon of this.polygonFeatures) {
        try {
          if (turf.booleanPointInPolygon(point, polygon)) {
            matchedPolygon = polygon;
            break; // 最初にマッチしたポリゴンを使用
          }
        } catch (error) {
          // ポリゴンの形状が不正な場合はスキップ
          console.warn(
            `Invalid polygon: ${polygon.properties.polygon_uuid}`,
            error
          );
        }
      }

      return {
        ...farmland,
        polygon: matchedPolygon,
      };
    });

    const matchedCount = this.farmlandWithPolygons.filter(
      (f) => f.polygon
    ).length;
    console.log(
      `Spatial join complete: ${matchedCount}/${this.farmlandFeatures.length} farmlands matched with polygons`
    );
  }

  // 空間結合を明示的に実行（ポリゴン表示が必要な場合のみ）
  public executeSpatialJoin(): void {
    if (this.farmlandWithPolygons.length === 0) {
      this.performSpatialJoin();
    }
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

  // ポリゴン付き農地データの取得（集落営農法人フラグ付き）
  getFarmlandsWithPolygonAndOwnership(): Array<
    FarmlandWithPolygon & { isCollectiveOwned: boolean }
  > {
    // 空間結合が実行されていない場合は、ポリゴンなしで返す
    if (
      this.farmlandWithPolygons.length === 0 &&
      this.farmlandFeatures.length > 0
    ) {
      console.log(
        "Spatial join not executed, returning farmlands without polygons"
      );
      return this.farmlandFeatures.map((feature) => ({
        ...feature,
        polygon: undefined,
        isCollectiveOwned: this.matchingResults.has(
          feature.properties.DaichoId
        ),
      }));
    }

    return this.farmlandWithPolygons.map((feature) => ({
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

  // 特定の農地の詳細情報取得（作期指定可能）
  getFarmlandDetails(daichoId: string, sakki?: "1" | "2") {
    const feature = this.farmlandFeatures.find(
      (f) => f.properties.DaichoId === daichoId
    );
    if (!feature) return null;

    const ownershipInfoList = this.matchingResults.get(daichoId);

    // 作期指定がある場合は該当する作期のデータのみ返す
    let ownershipInfo: OwnedFarmlandCSV | undefined;
    if (sakki && ownershipInfoList) {
      ownershipInfo = ownershipInfoList.find((csv) => csv.sakki === sakki);
    } else if (ownershipInfoList && ownershipInfoList.length > 0) {
      // 作期指定がない場合は最初のデータを返す
      ownershipInfo = ownershipInfoList[0];
    }

    return {
      feature,
      isCollectiveOwned: !!ownershipInfoList && ownershipInfoList.length > 0,
      ownershipInfo,
      ownershipInfoList, // すべての作期のデータ
    };
  }

  // 特定の農地の組織別色を取得
  getFarmlandColor(daichoId: string): string {
    const matchedCSVList = this.matchingResults.get(daichoId);
    if (!matchedCSVList || matchedCSVList.length === 0) {
      return "#FFFFFF"; // デフォルト色（その他農地）
    }

    // 最初のCSVレコードから組織名を取得（表作・裏作で組織は同じ）
    const matchedCSV = matchedCSVList[0];

    // 組織別の色を取得
    const organizationColors = [
      "#0066CC",
      "#FF6600",
      "#9966CC",
      "#FF9900",
      "#CC0066",
      "#00CCAA",
      "#6633FF",
      "#FF3366",
    ];

    const organizations = new Set<string>();
    for (const csvList of Array.from(this.matchingResults.values())) {
      if (csvList.length > 0) {
        organizations.add(csvList[0].organizationName);
      }
    }

    let colorIndex = 0;
    for (const org of Array.from(organizations)) {
      if (org === matchedCSV.organizationName) {
        return organizationColors[colorIndex % organizationColors.length];
      }
      colorIndex++;
    }

    return "#FF0000"; // フォールバック色
  }

  getPolygonFeatures(): PolygonFeature[] {
    return this.polygonFeatures;
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

    for (const hash of Array.from(farmerHashes)) {
      colorMap.set(hash, defaultColor);
    }

    // 組織名別に色を割り当て
    const organizations = new Set<string>();
    for (const csvDataList of Array.from(this.matchingResults.values())) {
      // 配列の最初の要素から組織名を取得（同じ農地の全作期は同じ組織）
      if (csvDataList.length > 0) {
        organizations.add(csvDataList[0].organizationName);
      }
    }

    const organizationColorMap = new Map<string, string>();
    let colorIndex = 0;
    for (const org of Array.from(organizations)) {
      organizationColorMap.set(
        org,
        organizationColors[colorIndex % organizationColors.length]
      );
      colorIndex++;
    }

    // マッチした農地に組織別の色を適用
    for (const feature of this.farmlandFeatures) {
      const matchedCSVList = this.matchingResults.get(feature.properties.DaichoId);
      if (matchedCSVList && matchedCSVList.length > 0) {
        // 配列の最初の要素から組織名を取得（表作・裏作で組織は同じ）
        const orgColor = organizationColorMap.get(matchedCSVList[0].organizationName);
        if (orgColor) {
          colorMap.set(feature.properties.FarmerIndicationNumberHash, orgColor);
        }
      }
    }

    return colorMap;
  }

  // 組織別の統計情報を取得
  getOrganizationStatistics() {
    const orgStats = new Map<
      string,
      {
        count: number;
        area: number;
        color: string;
      }
    >();

    const organizationColors = [
      "#0066CC",
      "#FF6600",
      "#9966CC",
      "#FF9900",
      "#CC0066",
      "#00CCAA",
      "#6633FF",
      "#FF3366",
    ];

    const organizations = new Set<string>();
    for (const csvDataList of Array.from(this.matchingResults.values())) {
      if (csvDataList.length > 0) {
        organizations.add(csvDataList[0].organizationName);
      }
    }

    // 組織別に色を割り当て
    let colorIndex = 0;
    for (const org of Array.from(organizations)) {
      orgStats.set(org, {
        count: 0,
        area: 0,
        color: organizationColors[colorIndex % organizationColors.length],
      });
      colorIndex++;
    }

    // 各農地を組織別に集計
    for (const feature of this.farmlandFeatures) {
      const matchedCSVList = this.matchingResults.get(feature.properties.DaichoId);
      if (matchedCSVList && matchedCSVList.length > 0) {
        const stats = orgStats.get(matchedCSVList[0].organizationName);
        if (stats) {
          stats.count++;
          stats.area += parseInt(feature.properties.AreaOnRegistry) || 0;
        }
      }
    }

    return Array.from(orgStats.entries()).map(([name, stats]) => ({
      organizationName: name,
      ...stats,
    }));
  }
}

// シングルトンインスタンス
export const dataService = new DataService();
