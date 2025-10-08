"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { dataService } from "@/services/dataService";
import { FarmlandFeature } from "@/types";

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
    Array<FarmlandFeature & { isCollectiveOwned: boolean }>
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<any>(null);
  const [organizationStats, setOrganizationStats] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);

        // データの読み込み
        await Promise.all([dataService.loadGeoJSON(), dataService.loadCSV()]);

        // マッチング済みデータの取得
        const farmlandsWithOwnership = dataService.getFarmlandsWithOwnership();
        setFarmlands(farmlandsWithOwnership);

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
    <div className="relative w-full h-screen">
      <DynamicMapContent
        farmlands={farmlands}
        loading={loading}
        statistics={statistics}
        organizationStats={organizationStats}
      />

      {/* 統計情報（画面右上） */}
      {statistics && !loading && (
        <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg z-[1000] min-w-[250px]">
          <h3 className="font-bold text-gray-800 mb-2">統計情報</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">総農地数:</span>
              <span className="font-semibold">
                {statistics.total.toLocaleString()}件
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">集落営農法人:</span>
              <span className="font-semibold text-red-600">
                {statistics.collective.count.toLocaleString()}件 (
                {statistics.collective.percentage.toFixed(1)}%)
              </span>
            </div>
            {/* 組織別統計 */}
            {organizationStats.length > 0 && (
              <div className="mt-2 space-y-1">
                {organizationStats.map((org, index) => (
                  <div key={index} className="flex justify-between text-xs">
                    <span 
                      className="text-gray-600"
                      style={{ color: org.color }}
                    >
                      ● {org.organizationName}:
                    </span>
                    <span 
                      className="font-semibold"
                      style={{ color: org.color }}
                    >
                      {org.count}件
                    </span>
                  </div>
                ))}
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-600">その他農地:</span>
              <span className="font-semibold text-teal-600">
                {statistics.individual.count.toLocaleString()}件 (
                {statistics.individual.percentage.toFixed(1)}%)
              </span>
            </div>
            <hr className="my-2" />
            <div className="flex justify-between">
              <span className="text-gray-600">マッチング率:</span>
              <span className="font-semibold text-green-600">
                {statistics.matchRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
