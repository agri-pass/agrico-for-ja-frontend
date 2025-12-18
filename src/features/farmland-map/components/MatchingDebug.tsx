"use client";

import { useState, useRef } from "react";
import {
  OwnedFarmlandCSV,
  parseOwnedFarmlandCSV,
  analyzeAddress,
  normalizeText,
  normalizeChiban,
} from "../lib/dataMatching";
import {
  performUnifiedMatching,
  UnifiedMatchingResult,
} from "../lib/matchingService";
import { FarmlandFeature, FarmlandGeoJSON } from "../types/farmland.types";

export default function MatchingDebug() {
  const [farmlands, setFarmlands] = useState<FarmlandFeature[]>([]);
  const [csvData, setCsvData] = useState<OwnedFarmlandCSV[]>([]);
  const [matchingResult, setMatchingResult] =
    useState<UnifiedMatchingResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnmatchedCSV, setSelectedUnmatchedCSV] =
    useState<OwnedFarmlandCSV | null>(null);
  const [selectedUnmatchedGeo, setSelectedUnmatchedGeo] =
    useState<FarmlandFeature | null>(null);
  const [uploadedCsvFileName, setUploadedCsvFileName] = useState<string | null>(null);
  const [uploadedGeoFileName, setUploadedGeoFileName] = useState<string | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);
  const geoFileInputRef = useRef<HTMLInputElement>(null);

  // CSVファイルアップロードハンドラー
  const handleCsvUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const csvText = e.target?.result as string;
      const parsedCSV = parseOwnedFarmlandCSV(csvText);
      setCsvData(parsedCSV);
      setUploadedCsvFileName(file.name);
      setMatchingResult(null);
      setSelectedUnmatchedCSV(null);
      setSelectedUnmatchedGeo(null);
      setLoading(false);
      console.log(`Uploaded CSV ${file.name}: ${parsedCSV.length} records`);
    };
    reader.readAsText(file);
  };

  // GeoJSONファイルアップロードハンドラー
  const handleGeoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const geoJson = JSON.parse(e.target?.result as string) as FarmlandGeoJSON;
        setFarmlands(geoJson.features);
        setUploadedGeoFileName(file.name);
        setMatchingResult(null);
        setSelectedUnmatchedCSV(null);
        setSelectedUnmatchedGeo(null);
        console.log(`Uploaded GeoJSON ${file.name}: ${geoJson.features.length} features`);
      } catch (error) {
        console.error("Failed to parse GeoJSON:", error);
        alert("GeoJSONファイルの解析に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
  };

  // マッチング実行（統一されたロジックを使用）
  const runMatching = () => {
    if (farmlands.length === 0 || csvData.length === 0) return;

    const result = performUnifiedMatching(farmlands, csvData);
    setMatchingResult(result);

    console.log("Matching result:", result);
    console.log(
      `Unique CSV matches: ${result.statistics.uniqueCSVMatches}/${result.statistics.totalCSV}`
    );
  };

  const renderCSVAnalysis = (csv: OwnedFarmlandCSV) => {
    return (
      <div className="p-3 border rounded bg-gray-50">
        <div className="font-semibold">{csv.fullAddress}</div>
        <div className="text-sm text-gray-600 mt-1">
          <div>大字: {csv.oaza}</div>
          <div>小字: {csv.koaza}</div>
          <div>
            地番: {csv.chiban}
            {csv.edaban ? `-${csv.edaban}` : ""}
          </div>
          {csv.cropCategory && (
            <div className="text-blue-600 font-semibold mt-1">
              作物: {csv.cropCategory}
            </div>
          )}
          {csv.variety && (
            <div className="text-blue-600">品種: {csv.variety}</div>
          )}
          {csv.sakki && (
            <div className="text-gray-600">
              作期: {csv.sakki === "1" ? "表作" : csv.sakki === "2" ? "裏作" : csv.sakki}
            </div>
          )}
          <div className="mt-2 text-xs">
            <div>正規化後:</div>
            <div>大字: {normalizeText(csv.oaza)}</div>
            <div>小字: {normalizeText(csv.koaza)}</div>
            <div>
              地番:{" "}
              {
                normalizeChiban(
                  csv.chiban + (csv.edaban ? `-${csv.edaban}` : "")
                ).full
              }
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderGeoAnalysis = (geo: FarmlandFeature) => {
    const addressAnalysis = analyzeAddress(geo.properties.Address);
    return (
      <div className="p-3 border rounded bg-blue-50">
        <div className="font-semibold">{geo.properties.Address}</div>
        <div className="text-sm text-gray-600 mt-1">
          <div>地番: {geo.properties.Tiban}</div>
          <div>面積: {geo.properties.AreaOnRegistry}㎡</div>
          <div className="mt-2 text-xs">
            <div>住所解析:</div>
            <div>都道府県: {addressAnalysis.prefecture || "N/A"}</div>
            <div>市: {addressAnalysis.city || "N/A"}</div>
            <div>町: {addressAnalysis.town || "N/A"}</div>
            <div>小字: {addressAnalysis.koaza || "N/A"}</div>
            <div>地番: {addressAnalysis.chiban || "N/A"}</div>
          </div>
          <div className="mt-2 text-xs">
            <div>正規化後:</div>
            <div>住所: {normalizeText(geo.properties.Address)}</div>
            <div>地番: {normalizeChiban(geo.properties.Tiban).full}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          マッチングデバッグツール
        </h1>
        <p className="text-gray-600">マッチング処理の詳細分析と改善</p>
      </div>

      {/* コントロールパネル */}
      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* GeoJSONファイルアップロード */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={geoFileInputRef}
              accept=".json,.geojson"
              onChange={handleGeoUpload}
              className="hidden"
            />
            <button
              onClick={() => geoFileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              GeoJSONアップロード
            </button>
            {uploadedGeoFileName && (
              <span className="text-sm text-blue-600 font-medium">
                {uploadedGeoFileName}
              </span>
            )}
          </div>

          {/* CSVファイルアップロード */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={csvFileInputRef}
              accept=".csv"
              onChange={handleCsvUpload}
              className="hidden"
            />
            <button
              onClick={() => csvFileInputRef.current?.click()}
              disabled={loading}
              className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
            >
              CSVアップロード
            </button>
            {uploadedCsvFileName && (
              <span className="text-sm text-purple-600 font-medium">
                {uploadedCsvFileName}
              </span>
            )}
          </div>

          <button
            onClick={runMatching}
            disabled={loading || farmlands.length === 0 || csvData.length === 0}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            マッチング実行
          </button>

          {matchingResult && (
            <div className="text-sm text-gray-600">
              マッチング率:{" "}
              <span className="font-bold text-green-600">
                {matchingResult.statistics.matchRate.toFixed(1)}%
              </span>
              ({matchingResult.statistics.uniqueCSVMatches}/
              {matchingResult.statistics.totalCSV})
            </div>
          )}
        </div>

        {/* データ件数表示 */}
        <div className="mt-3 flex gap-6 text-sm text-gray-600">
          <div>
            GeoJSONデータ:{" "}
            <span className={`font-semibold ${farmlands.length > 0 ? "text-blue-600" : "text-gray-400"}`}>
              {farmlands.length > 0 ? `${farmlands.length}件` : "未読み込み"}
            </span>
          </div>
          <div>
            CSVデータ:{" "}
            <span className={`font-semibold ${csvData.length > 0 ? "text-purple-600" : "text-gray-400"}`}>
              {csvData.length > 0 ? `${csvData.length}件` : "未読み込み"}
            </span>
          </div>
        </div>
      </div>

      {/* 統計情報 */}
      {matchingResult && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800">GeoJSONデータ</h3>
            <p className="text-2xl font-bold text-blue-600">
              {matchingResult.statistics.totalFeatures.toLocaleString()}件
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800">CSVデータ</h3>
            <p className="text-2xl font-bold text-orange-600">
              {matchingResult.statistics.totalCSV.toLocaleString()}件
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800">マッチ成功</h3>
            <p className="text-2xl font-bold text-green-600">
              {matchingResult.statistics.matchedFeatures.toLocaleString()}件
            </p>
          </div>
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800">マッチ失敗</h3>
            <p className="text-2xl font-bold text-red-600">
              {matchingResult.unmatchedCSV.length.toLocaleString()}件
            </p>
          </div>
        </div>
      )}

      {/* 未マッチデータの分析 */}
      {matchingResult && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 未マッチCSVデータ */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">
              未マッチCSVデータ ({matchingResult.unmatchedCSV.length}件)
            </h3>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {matchingResult.unmatchedCSV.map((csv, index) => (
                <div
                  key={index}
                  className={`cursor-pointer transition-colors ${
                    selectedUnmatchedCSV === csv ? "ring-2 ring-red-500" : ""
                  }`}
                  onClick={() => setSelectedUnmatchedCSV(csv)}
                >
                  {renderCSVAnalysis(csv)}
                </div>
              ))}
            </div>
          </div>

          {/* 候補GeoJSONデータ（部分マッチ検索） */}
          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="font-semibold text-gray-800 mb-4">
              候補GeoJSONデータ
            </h3>
            {selectedUnmatchedCSV ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {farmlands
                  .filter((geo) => {
                    const address = normalizeText(geo.properties.Address);
                    const oaza = normalizeText(selectedUnmatchedCSV.oaza);
                    const koaza = normalizeText(selectedUnmatchedCSV.koaza);

                    // 部分マッチ候補を表示
                    return (
                      address.includes(oaza) ||
                      address.includes(koaza) ||
                      geo.properties.Tiban === selectedUnmatchedCSV.chiban
                    );
                  })
                  .slice(0, 10) // 最大10件まで表示
                  .map((geo, index) => (
                    <div
                      key={index}
                      className={`cursor-pointer transition-colors ${
                        selectedUnmatchedGeo === geo
                          ? "ring-2 ring-blue-500"
                          : ""
                      }`}
                      onClick={() => setSelectedUnmatchedGeo(geo)}
                    >
                      {renderGeoAnalysis(geo)}
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-gray-500">
                左側の未マッチCSVデータを選択してください
              </p>
            )}
          </div>
        </div>
      )}

      {/* 詳細比較 */}
      {selectedUnmatchedCSV && selectedUnmatchedGeo && (
        <div className="bg-yellow-50 p-4 rounded-lg shadow mt-6">
          <h3 className="font-semibold text-gray-800 mb-4">詳細比較</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-red-600 mb-2">CSV データ</h4>
              {renderCSVAnalysis(selectedUnmatchedCSV)}
            </div>
            <div>
              <h4 className="font-semibold text-blue-600 mb-2">
                GeoJSON データ
              </h4>
              {renderGeoAnalysis(selectedUnmatchedGeo)}
            </div>
          </div>

          <div className="mt-4 p-3 bg-white rounded border">
            <h4 className="font-semibold mb-2">マッチング判定</h4>
            <div className="text-sm space-y-1">
              <div>
                地番マッチ:{" "}
                {normalizeChiban(selectedUnmatchedCSV.chiban).full ===
                normalizeChiban(selectedUnmatchedGeo.properties.Tiban).full
                  ? "✅"
                  : "❌"}
              </div>
              <div>
                大字マッチ:{" "}
                {normalizeText(
                  selectedUnmatchedGeo.properties.Address
                ).includes(normalizeText(selectedUnmatchedCSV.oaza))
                  ? "✅"
                  : "❌"}
              </div>
              <div>
                小字マッチ:{" "}
                {normalizeText(
                  selectedUnmatchedGeo.properties.Address
                ).includes(normalizeText(selectedUnmatchedCSV.koaza))
                  ? "✅"
                  : "❌"}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
