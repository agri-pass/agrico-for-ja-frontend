"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { dataService } from "../services/dataService";
import { FarmlandWithPolygon } from "../types/farmland.types";
import {
  Statistics,
  OrganizationStatistics,
} from "../types/statistics.types";

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [organizationStats, setOrganizationStats] = useState<
    OrganizationStatistics[]
  >([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // データの読み込み（GeoJSON, CSV, Polygon）
        await Promise.all([
          dataService.loadGeoJSON(),
          dataService.loadCSV(),
          dataService.loadPolygons(),
        ]);

        // ポリゴン付きマッチング済みデータの取得
        const farmlandsWithPolygonAndOwnership =
          dataService.getFarmlandsWithPolygonAndOwnership();
        setFarmlands(farmlandsWithPolygonAndOwnership);

        // 統計情報の取得
        const stats = dataService.getStatistics();
        setStatistics(stats);

        // 組織別統計の取得
        const orgStats = dataService.getOrganizationStatistics();
        setOrganizationStats(orgStats);

        console.log("Data loaded successfully:", stats);
        console.log("Organization stats:", orgStats);
      } catch (err) {
        console.error("Failed to load data:", err);
        setError(
          err instanceof Error ? err.message : "データの読み込みに失敗しました"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (error) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-6 rounded-lg shadow-lg max-w-md">
          <h2 className="text-red-600 text-xl font-bold mb-2">エラー</h2>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <DynamicMapContent
        farmlands={farmlands}
        loading={loading}
        statistics={statistics}
        organizationStats={organizationStats}
      />
    </div>
  );
}
