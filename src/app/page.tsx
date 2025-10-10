"use client";

import { FarmlandMap } from "@/features/farmland-map";
import { dataService } from "@/features/farmland-map/services/dataService";
import { ExportService } from "@/features/farmland-map/services/exportService";

export default function Home() {
  const handleExportAll = () => {
    const farmlands = dataService.getFarmlandsWithPolygonAndOwnership();
    ExportService.exportToExcel(farmlands, "農地データ_全件.xlsx");
  };

  const handleExportCollective = () => {
    const farmlands = dataService.getFarmlandsWithPolygonAndOwnership();
    ExportService.exportCollectiveOnlyToExcel(
      farmlands,
      "農地データ_集落営農法人のみ.xlsx"
    );
  };

  const handleExportWithPolygon = () => {
    const farmlands = dataService.getFarmlandsWithPolygonAndOwnership();
    ExportService.exportWithPolygonOnlyToExcel(
      farmlands,
      "農地データ_ポリゴン付き.xlsx"
    );
  };

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="bg-white shadow-md z-[1000] p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              農地管理システム - みやま市
            </h1>
            <p className="text-sm text-gray-600">
              あぐり支援室所有農地の可視化
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
            >
              📥 全件エクスポート
            </button>
            <button
              onClick={handleExportCollective}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              📥 集落営農法人のみ
            </button>
            <button
              onClick={handleExportWithPolygon}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              📥 ポリゴン付きのみ
            </button>
            <a
              href="/debug"
              className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700 text-sm"
            >
              マッチングデバッグ
            </a>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-0 h-full">
        <FarmlandMap />
      </main>
    </div>
  );
}
