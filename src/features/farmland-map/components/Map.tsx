"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { dataService } from "../services/dataService";
import { FarmlandWithPolygon } from "../types/farmland.types";
import {
  Statistics,
  OrganizationStatistics,
} from "../types/statistics.types";
import FileUpload from "./FileUpload";

// Leafletを動的インポート（SSR回避）
const DynamicMapContent = dynamic(() => import("./MapContent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">地図を読み込み中...</p>
      </div>
    </div>
  ),
});

export default function Map() {
  const [farmlands, setFarmlands] = useState<
    Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [organizationStats, setOrganizationStats] = useState<
    OrganizationStatistics[]
  >([]);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(true);

  const loadDataFromService = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // 空間結合を実行（ポリゴン表示のため）
      console.log("Executing spatial join...");
      dataService.executeSpatialJoin();

      // ポリゴン付きマッチング済みデータの取得
      const farmlandsWithPolygonAndOwnership =
        dataService.getFarmlandsWithPolygonAndOwnership();
      console.log("Farmlands with polygons:", {
        total: farmlandsWithPolygonAndOwnership.length,
        withPolygon: farmlandsWithPolygonAndOwnership.filter((f) => f.polygon)
          .length,
      });
      setFarmlands(farmlandsWithPolygonAndOwnership);

      // 統計情報の取得
      const stats = dataService.getStatistics();
      setStatistics(stats);

      // 組織別統計の取得
      const orgStats = dataService.getOrganizationStatistics();
      setOrganizationStats(orgStats);

      console.log("Data loaded successfully:", stats);
      console.log("Organization stats:", orgStats);

      setDataLoaded(true);
      setShowFileUpload(false);
    } catch (err) {
      console.error("Failed to load data:", err);
      setError(
        err instanceof Error ? err.message : "データの読み込みに失敗しました"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoadFromFiles = useCallback(
    async (pinFile: File, polygonFile: File, csvFile: File) => {
      try {
        setLoading(true);
        setError(null);

        // データをリセット
        dataService.resetData();

        // ファイルからデータを読み込み
        await Promise.all([
          dataService.loadGeoJSONFromFile(pinFile),
          dataService.loadPolygonsFromFile(polygonFile),
          dataService.loadCSVFromFile(csvFile),
        ]);

        // データサービスから地図データを取得
        await loadDataFromService();
      } catch (err) {
        console.error("Failed to load data from files:", err);
        setError(
          err instanceof Error
            ? err.message
            : "ファイルからのデータ読み込みに失敗しました"
        );
        throw err;
      }
    },
    [loadDataFromService]
  );

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h2 className="text-red-600 text-xl font-bold mb-2">エラー</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => {
              setError(null);
              setShowFileUpload(true);
            }}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  // ファイルアップロード画面
  if (showFileUpload && !dataLoaded) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100 p-4">
        <div className="max-w-4xl w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
            農地管理システム
          </h1>
          <FileUpload
            onFilesLoaded={() => setShowFileUpload(false)}
            onLoadData={handleLoadFromFiles}
          />
        </div>
      </div>
    );
  }

  // ローディング画面
  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">データを読み込み中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* データ再アップロードボタン */}
      <button
        onClick={() => {
          setShowFileUpload(true);
          setDataLoaded(false);
        }}
        className="absolute top-4 right-4 z-[1000] px-4 py-2 bg-white border border-gray-300 rounded shadow hover:bg-gray-50 text-sm"
      >
        新しいデータを読み込む
      </button>

      <DynamicMapContent
        farmlands={farmlands}
        loading={false}
        statistics={statistics}
        organizationStats={organizationStats}
      />
    </div>
  );
}
