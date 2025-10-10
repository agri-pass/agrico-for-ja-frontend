"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, Modal } from "antd";
import { FarmlandWithPolygon } from "../types/farmland.types";
import { dataService } from "../services/dataService";
import { formatArea } from "@/shared/lib/utils";

// Leafletのデフォルトアイコンを修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface Props {
  farmlands: Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>;
  loading: boolean;
  statistics: any;
  organizationStats: any[];
}

export default function MapContent({
  farmlands,
  loading,
  statistics,
  organizationStats,
}: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const polygonsRef = useRef<L.LayerGroup | null>(null);
  const [selectedFarmland, setSelectedFarmland] = useState<any>(null);

  // みやま市の中心座標
  const MIYAMA_CENTER: [number, number] = [
    33.082281575000025, 130.47120210700007,
  ];
  const DEFAULT_ZOOM = 13;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 地図の初期化
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        center: MIYAMA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // 航空写真タイルレイヤーの追加（Esri World Imagery）
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution:
            '© <a href="https://www.esri.com/">Esri</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
          maxZoom: 19,
        }
      ).addTo(mapRef.current);

      // マーカーグループの初期化
      markersRef.current = L.layerGroup().addTo(mapRef.current);

      // ポリゴングループの初期化
      polygonsRef.current = L.layerGroup().addTo(mapRef.current);

      // Leafletに地図サイズを再計算させる
      setTimeout(() => {
        mapRef.current?.invalidateSize();
      }, 100);
    }

    // クリーンアップ関数
    return () => {
      if (markersRef.current) {
        markersRef.current.clearLayers();
      }
      if (polygonsRef.current) {
        polygonsRef.current.clearLayers();
      }
    };
  }, []);

  // 農地マーカーとポリゴンの更新
  useEffect(() => {
    if (
      !mapRef.current ||
      !markersRef.current ||
      !polygonsRef.current ||
      loading ||
      farmlands.length === 0
    ) {
      return;
    }

    // 既存のマーカーとポリゴンをクリア
    markersRef.current.clearLayers();
    polygonsRef.current.clearLayers();

    // 各農地にマーカーとポリゴンを追加
    farmlands.forEach((farmland) => {
      const { geometry, properties, isCollectiveOwned, polygon } = farmland;
      const [lng, lat] = geometry.coordinates;

      // 組織に基づいて色を決定
      const color = dataService.getFarmlandColor(properties.DaichoId);

      // ポリゴンがある場合は描画
      if (polygon) {
        const polygonLayer = L.polygon(
          polygon.geometry.coordinates[0].map((coord) => [coord[1], coord[0]]),
          {
            color: color,
            fillColor: color,
            fillOpacity: 0.3,
            weight: 2,
          }
        ).on("click", () => {
          const details = dataService.getFarmlandDetails(properties.DaichoId);
          setSelectedFarmland(details);
        });

        // ポリゴンにもツールチップを追加
        const tooltipContent = `
          <div class="text-xs">
            <div class="font-semibold">${properties.Address}</div>
            <div class="text-gray-600">地番: ${properties.Tiban}</div>
            <div class="text-gray-600">面積: ${formatArea(
              properties.AreaOnRegistry
            )}</div>
            <div class="text-gray-600">区分: ${
              properties.ClassificationOfLandCodeName
            }</div>
            ${
              isCollectiveOwned
                ? '<div class="text-red-600 font-semibold">集落営農法人</div>'
                : ""
            }
          </div>
        `;

        polygonLayer.bindTooltip(tooltipContent, {
          direction: "top",
          opacity: 0.9,
        });

        polygonsRef.current?.addLayer(polygonLayer);
      }

      // カスタムアイコンの作成
      const icon = L.divIcon({
        html: `
          <div style="
            background-color: ${color};
            width: 12px;
            height: 12px;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            ${isCollectiveOwned ? "border-width: 3px; border-color: #000;" : ""}
          "></div>
        `,
        className: "custom-farmland-marker",
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      // マーカーを作成
      const marker = L.marker([lat, lng], { icon }).on("click", () => {
        const details = dataService.getFarmlandDetails(properties.DaichoId);
        setSelectedFarmland(details);
      });

      // ツールチップの追加
      const tooltipContent = `
        <div class="text-xs">
          <div class="font-semibold">${properties.Address}</div>
          <div class="text-gray-600">地番: ${properties.Tiban}</div>
          <div class="text-gray-600">面積: ${formatArea(
            properties.AreaOnRegistry
          )}</div>
          <div class="text-gray-600">区分: ${
            properties.ClassificationOfLandCodeName
          }</div>
          ${
            isCollectiveOwned
              ? '<div class="text-red-600 font-semibold">集落営農法人</div>'
              : ""
          }
        </div>
      `;

      marker.bindTooltip(tooltipContent, {
        direction: "top",
        offset: [0, -10],
        opacity: 0.9,
      });

      // マーカーグループに追加
      markersRef.current?.addLayer(marker);
    });

    const polygonCount = farmlands.filter((f) => f.polygon).length;
    console.log(
      `Added ${farmlands.length} markers and ${polygonCount} polygons to map`
    );
  }, [farmlands, loading]);

  return (
    <div className="relative w-full h-full">
      <div
        id="map"
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* 統計情報（画面右上） */}
      {statistics && !loading && (
        <Card
          title="統計情報"
          style={{
            position: "absolute",
            top: 96,
            right: 16,
            width: 280,
            zIndex: 1000,
          }}
          size="small"
        >
          <div className="space-y-2 text-sm">
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
                    <span style={{ color: org.color }}>
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
        </Card>
      )}

      {/* 農地詳細モーダル */}
      <Modal
        title="農地詳細"
        open={!!selectedFarmland}
        onCancel={() => setSelectedFarmland(null)}
        footer={null}
        width={650}
      >
        {selectedFarmland && (
          <div className="space-y-3 text-base">
            <div>
              <span className="text-gray-600">耕作者：</span>
              <span className="text-gray-900 font-medium">
                {selectedFarmland.isCollectiveOwned
                  ? selectedFarmland.ownershipInfo?.organizationName ||
                    "集落営農法人"
                  : "その他"}
              </span>
            </div>

            <div>
              <span className="text-gray-600">住所：</span>
              <span className="text-gray-900 font-medium">
                {selectedFarmland.feature.properties.Address}
              </span>
            </div>

            <div>
              <span className="text-gray-600">地番：</span>
              <span className="text-gray-900 font-medium">
                {selectedFarmland.feature.properties.Tiban}
              </span>
            </div>

            <div>
              <span className="text-gray-600">面積：</span>
              <span className="text-gray-900 font-medium">
                {formatArea(selectedFarmland.feature.properties.AreaOnRegistry)}
              </span>
            </div>

            <div>
              <span className="text-gray-600">農地区分：</span>
              <span className="text-gray-900 font-medium">
                {
                  selectedFarmland.feature.properties
                    .ClassificationOfLandCodeName
                }
              </span>
            </div>

            {/* 技術情報（開発用） */}
            <div className="border-t pt-3 mt-4">
              <details className="cursor-pointer">
                <summary className="text-xs font-semibold text-gray-400 hover:text-gray-600">
                  技術情報（開発用）
                </summary>
                <div className="mt-2 text-xs text-gray-500 space-y-1 pl-4">
                  <p>ID: {selectedFarmland.feature.properties.DaichoId}</p>
                  <p>
                    座標: [
                    {selectedFarmland.feature.geometry.coordinates.join(", ")}]
                  </p>
                </div>
              </details>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
