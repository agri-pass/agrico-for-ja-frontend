"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Card, Modal, Radio } from "antd";
import { FarmlandWithPolygon, PolygonFeature } from "../types/farmland.types";
import {
  Statistics,
  OrganizationStatistics,
  FarmlandDetails,
} from "../types/statistics.types";
import { dataService, DataService } from "../services/dataService";
import { formatArea } from "@/shared/lib/utils";

// Leafletのデフォルトアイコンを修正
delete (L.Icon.Default.prototype as unknown as { _getIconUrl: unknown })
  ._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// みやま市の中心座標（定数）
const MIYAMA_CENTER: [number, number] = [
  33.082281575000025, 130.47120210700007,
];

// 品種ごとの色パレット（対照的な色）
const VARIETY_COLORS: Record<string, string> = {
  // 米系（対照的な色）
  元気つくし: "#2E7D32", // 濃い緑
  ヒノヒカリ: "#1976D2", // 青
  夢つくし: "#D32F2F", // 赤
  // 麦系（明るい色）
  ニシホナミ: "#FF9800", // オレンジ
  はるか二条: "#FDD835", // 黄色
  // 大豆系（紫/茶色）
  大豆: "#7B1FA2", // 紫
};

// 品種から色を取得する関数
function getVarietyColor(variety?: string): string {
  if (!variety) return "#CCCCCC"; // デフォルト色（灰色）
  return VARIETY_COLORS[variety] || "#CCCCCC";
}

interface Props {
  farmlands: Array<FarmlandWithPolygon & { isCollectiveOwned: boolean }>;
  loading: boolean;
  statistics: Statistics | null;
  organizationStats: OrganizationStatistics[];
}

export default function MapContent({
  farmlands,
  loading,
  statistics,
  organizationStats,
}: Props) {
  const DEFAULT_ZOOM = 13; // ポリゴンが見えるズームレベルで開始
  const POLYGON_ZOOM_THRESHOLD = 12; // ポリゴンを表示する最小ズームレベル（さらに下げました）

  const mapRef = useRef<L.Map | null>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const polygonsRef = useRef<L.LayerGroup | null>(null);
  const unmatchedPolygonsRef = useRef<L.LayerGroup | null>(null);
  const initializingRef = useRef(false);
  const [selectedFarmland, setSelectedFarmland] =
    useState<FarmlandDetails | null>(null);
  const [renderProgress, setRenderProgress] = useState(100);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [currentZoom, setCurrentZoom] = useState(DEFAULT_ZOOM);
  const [showPins, setShowPins] = useState(true);
  const [showPolygons, setShowPolygons] = useState(true);
  const [showUnmatchedPolygons, setShowUnmatchedPolygons] = useState(false);
  const [sakkiFilter, setSakkiFilter] = useState<"1" | "2">("1"); // 作期フィルター（1: 表作、2: 裏作）

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 地図の初期化
    const initMap = async () => {
      // 既に初期化中または初期化済みの場合はスキップ
      if (initializingRef.current || mapRef.current) return;

      initializingRef.current = true;

      try {
        // leaflet.markerclusterを動的にインポート
        await import("leaflet.markercluster/dist/MarkerCluster.css");
        await import("leaflet.markercluster/dist/MarkerCluster.Default.css");
        await import("leaflet.markercluster");

        // 再度チェック（非同期処理中に他の初期化が走った可能性）
        if (mapRef.current) return;

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

        // マーカークラスタグループの初期化
        markerClusterRef.current = L.markerClusterGroup({
          chunkedLoading: true, // 段階的読み込みを有効化
          chunkInterval: 200, // マーカー追加の間隔（ms）
          chunkDelay: 50, // チャンク間の遅延（ms）
          maxClusterRadius: 50, // クラスタの最大半径を小さく（広域でも個別ピンが見えやすい）
          disableClusteringAtZoom: 14, // ズーム14以上でクラスタリング解除
          spiderfyOnMaxZoom: true, // 最大ズーム時にスパイダー表示
          showCoverageOnHover: true, // ホバー時にカバレッジエリアを表示
          zoomToBoundsOnClick: true, // クリック時にズーム
          // クラスタアイコンのカスタマイズ
          iconCreateFunction: function (cluster) {
            const count = cluster.getChildCount();
            let className = "marker-cluster-";

            if (count < 10) {
              className += "small";
            } else if (count < 100) {
              className += "medium";
            } else {
              className += "large";
            }

            return L.divIcon({
              html: `<div><span>${count}</span></div>`,
              className: "marker-cluster " + className,
              iconSize: L.point(40, 40),
            });
          },
        });
        mapRef.current.addLayer(markerClusterRef.current);

        // ポリゴングループの初期化
        polygonsRef.current = L.layerGroup().addTo(mapRef.current);

        // マッチしなかったポリゴングループの初期化
        unmatchedPolygonsRef.current = L.layerGroup();

        // ズームイベントでポリゴンの表示/非表示を制御
        mapRef.current.on("zoomend", () => {
          const zoom = mapRef.current?.getZoom() || 0;
          setCurrentZoom(zoom); // ズームレベルを更新
          if (polygonsRef.current) {
            if (zoom >= POLYGON_ZOOM_THRESHOLD) {
              if (!mapRef.current?.hasLayer(polygonsRef.current)) {
                mapRef.current?.addLayer(polygonsRef.current);
              }
            } else {
              if (mapRef.current?.hasLayer(polygonsRef.current)) {
                mapRef.current?.removeLayer(polygonsRef.current);
              }
            }
          }
        });

        // Leafletに地図サイズを再計算させる
        setTimeout(() => {
          mapRef.current?.invalidateSize();
          const zoom = mapRef.current?.getZoom() || 0;
          setCurrentZoom(zoom);
          console.log(`Map initialized with zoom: ${zoom}`);
          setMapInitialized(true);
        }, 100);
      } catch (error) {
        console.error("Failed to initialize map:", error);
        initializingRef.current = false;
      }
    };

    // 地図を初期化
    initMap();

    // クリーンアップ関数
    return () => {
      if (markerClusterRef.current) {
        markerClusterRef.current.clearLayers();
      }
      if (polygonsRef.current) {
        polygonsRef.current.clearLayers();
      }
      if (unmatchedPolygonsRef.current) {
        unmatchedPolygonsRef.current.clearLayers();
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      initializingRef.current = false;
    };
  }, []);

  // マッチしなかったポリゴンを表示するuseEffect
  useEffect(() => {
    if (!mapRef.current || !unmatchedPolygonsRef.current || !mapInitialized) {
      return;
    }

    const currentZoom = mapRef.current.getZoom() || 0;

    if (showUnmatchedPolygons && currentZoom >= POLYGON_ZOOM_THRESHOLD) {
      // 全てのポリゴンを取得してマッチしていないものを表示
      import("../services/dataService").then(({ dataService }) => {
        const allPolygons =
          (dataService as DataService).getPolygonFeatures() || [];
        const matchedPolygonIds = new Set(
          farmlands
            .filter((f) => f.polygon)
            .map((f) => f.polygon?.properties.polygon_uuid)
        );

        unmatchedPolygonsRef.current?.clearLayers();

        allPolygons.forEach((polygon: PolygonFeature) => {
          if (!matchedPolygonIds.has(polygon.properties.polygon_uuid)) {
            const polygonLayer = L.polygon(
              polygon.geometry.coordinates[0].map((coord: number[]) => [
                coord[1],
                coord[0],
              ]),
              {
                color: "#888888",
                fillColor: "#888888",
                fillOpacity: 0.2,
                weight: 1,
                dashArray: "5, 5",
              }
            );

            const tooltipContent = `
              <div class="text-xs">
                <div class="font-semibold text-gray-600">未マッチポリゴン</div>
                <div class="text-gray-500">ID: ${
                  polygon.properties.polygon_uuid || "N/A"
                }</div>
              </div>
            `;

            polygonLayer.bindTooltip(tooltipContent, {
              direction: "top",
              opacity: 0.9,
            });

            unmatchedPolygonsRef.current?.addLayer(polygonLayer);
          }
        });

        if (
          unmatchedPolygonsRef.current &&
          mapRef.current &&
          !mapRef.current.hasLayer(unmatchedPolygonsRef.current)
        ) {
          mapRef.current.addLayer(unmatchedPolygonsRef.current);
        }
      });
    } else {
      if (
        unmatchedPolygonsRef.current &&
        mapRef.current?.hasLayer(unmatchedPolygonsRef.current)
      ) {
        mapRef.current?.removeLayer(unmatchedPolygonsRef.current);
      }
    }
  }, [showUnmatchedPolygons, mapInitialized, farmlands]);

  // 農地マーカーとポリゴンの更新（段階的レンダリング）
  useEffect(() => {
    console.log("Marker effect check:", {
      mapInitialized,
      hasMap: !!mapRef.current,
      hasCluster: !!markerClusterRef.current,
      hasPolygons: !!polygonsRef.current,
      loading,
      farmlandsCount: farmlands.length,
    });

    if (
      !mapInitialized ||
      !mapRef.current ||
      !markerClusterRef.current ||
      !polygonsRef.current ||
      loading ||
      farmlands.length === 0
    ) {
      return;
    }

    console.log(`Starting to render ${farmlands.length} farmlands`);

    // 既存のマーカーとポリゴンをクリア
    markerClusterRef.current.clearLayers();
    polygonsRef.current.clearLayers();
    setRenderProgress(0);

    const BATCH_SIZE = 500; // 一度に処理するマーカー数
    let currentIndex = 0;
    let cancelled = false;

    // 段階的にマーカーとポリゴンを追加する関数
    const addBatch = () => {
      if (cancelled) return;

      const endIndex = Math.min(currentIndex + BATCH_SIZE, farmlands.length);
      const batch = farmlands.slice(currentIndex, endIndex);

      const markers: L.Marker[] = [];
      const currentZoom = mapRef.current?.getZoom() || 0;
      const shouldShowPolygons =
        showPolygons && currentZoom >= POLYGON_ZOOM_THRESHOLD;

      batch.forEach((farmland, index) => {
        const { geometry, properties, isCollectiveOwned, polygon } = farmland;
        const [lng, lat] = geometry.coordinates;

        // デバッグ: 最初の数件でポリゴン情報をログ出力
        if (currentIndex === 0 && index < 3) {
          console.log(`Farmland ${index}:`, {
            hasPolygon: !!polygon,
            shouldShowPolygons,
            currentZoom,
            threshold: POLYGON_ZOOM_THRESHOLD,
          });
        }

        // 組織に基づいて色を決定
        const color = dataService.getFarmlandColor(properties.DaichoId);

        // 作期フィルター: 指定された作期のデータを取得
        const details = dataService.getFarmlandDetails(
          properties.DaichoId,
          sakkiFilter
        );
        const cropInfo = details?.ownershipInfo;

        // 作期フィルター: 集落営農法人の農地で、選択された作期のデータがない場合はスキップ
        if (isCollectiveOwned && !cropInfo) {
          return;
        }

        // 品種の色（塗りつぶし）
        const varietyColor = getVarietyColor(cropInfo?.variety);
        // 耕作者の色（枠線）
        const borderColor = color;

        // ポリゴンがある場合は描画（ズームレベルが十分な場合のみ）
        if (polygon && shouldShowPolygons) {
          const polygonLayer = L.polygon(
            polygon.geometry.coordinates[0].map((coord) => [
              coord[1],
              coord[0],
            ]),
            {
              color: borderColor, // 枠線: 組織の色
              fillColor: varietyColor, // 塗りつぶし: 品種の色
              fillOpacity: isCollectiveOwned ? 1 : 0.7, // 耕作者がいる場合は不透明、いない場合は薄く
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

        // カスタムアイコンの作成（品種の色を塗りつぶし、耕作者の色を枠線に）
        const icon = L.divIcon({
          html: `
            <div style="
              background-color: ${varietyColor};
              width: 12px;
              height: 12px;
              border-radius: 50%;
              border: 3px solid ${borderColor};
              box-shadow: 0 2px 4px rgba(0,0,0,0.3);
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

        // ツールチップの追加（作物情報を含む）
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
            ${
              cropInfo?.cropCategory
                ? `<div class="text-blue-600">作物: ${cropInfo.cropCategory}</div>`
                : ""
            }
            ${
              cropInfo?.variety
                ? `<div class="text-blue-600">品種: ${cropInfo.variety}</div>`
                : ""
            }
            ${
              cropInfo?.sakki
                ? `<div class="text-gray-600">作期: ${
                    cropInfo.sakki === "1" ? "表作" : "裏作"
                  }</div>`
                : ""
            }
          </div>
        `;

        marker.bindTooltip(tooltipContent, {
          direction: "top",
          offset: [0, -10],
          opacity: 0.9,
        });

        markers.push(marker);
      });

      // バッチでマーカーを追加（表示設定に応じて）
      if (showPins) {
        markerClusterRef.current?.addLayers(markers);
      }

      currentIndex = endIndex;
      const progress = Math.round((currentIndex / farmlands.length) * 100);
      setRenderProgress(progress);

      // 次のバッチを処理
      if (currentIndex < farmlands.length) {
        requestAnimationFrame(addBatch);
      } else {
        const polygonCount = farmlands.filter((f) => f.polygon).length;
        const totalPolygonsAdded = polygonsRef.current?.getLayers().length || 0;
        console.log(
          `Rendering complete: ${farmlands.length} markers, ${polygonCount} have polygon data, ${totalPolygonsAdded} polygons actually added to map (zoom: ${currentZoom}, threshold: ${POLYGON_ZOOM_THRESHOLD})`
        );
      }
    };

    // 最初のバッチを処理
    requestAnimationFrame(addBatch);

    // クリーンアップ
    return () => {
      cancelled = true;
    };
  }, [farmlands, loading, mapInitialized, showPins, showPolygons, sakkiFilter]);

  return (
    <div className="relative w-full h-full">
      <div
        id="map"
        className="absolute inset-0"
        style={{ width: "100%", height: "100%" }}
      />

      {/* ズームレベル表示 */}
      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 1000,
          backgroundColor: "white",
          padding: "8px 12px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <div className="text-sm font-semibold">
          ズーム: {currentZoom.toFixed(1)}
        </div>
        <div className="text-xs text-gray-600">
          {currentZoom >= POLYGON_ZOOM_THRESHOLD
            ? "ポリゴン表示中"
            : `ポリゴン: ズーム${POLYGON_ZOOM_THRESHOLD}以上で表示`}
        </div>
      </div>

      {/* 表示切り替えコントロール */}
      <div
        style={{
          position: "absolute",
          top: 100,
          left: 16,
          zIndex: 1000,
          backgroundColor: "white",
          padding: "12px",
          borderRadius: "4px",
          boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
        }}
      >
        <div className="text-sm font-semibold mb-2">表示設定</div>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showPins}
              onChange={(e) => setShowPins(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm">ピンを表示</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showPolygons}
              onChange={(e) => setShowPolygons(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm">ポリゴンを表示</span>
          </label>
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={showUnmatchedPolygons}
              onChange={(e) => setShowUnmatchedPolygons(e.target.checked)}
              className="mr-2 w-4 h-4"
            />
            <span className="text-sm text-gray-600">未マッチポリゴン</span>
          </label>
        </div>
      </div>

      {/* 作期切り替え（画面右上） */}
      {!loading && renderProgress === 100 && (
        <Card
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 280,
            zIndex: 1000,
          }}
          size="small"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 font-medium">作期:</span>
            <Radio.Group
              value={sakkiFilter}
              onChange={(e) => setSakkiFilter(e.target.value)}
              size="small"
            >
              <Radio.Button value="1">表作</Radio.Button>
              <Radio.Button value="2">裏作</Radio.Button>
            </Radio.Group>
          </div>
        </Card>
      )}

      {/* レンダリング進捗表示 */}
      {renderProgress > 0 && renderProgress < 100 && (
        <Card
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            width: 280,
            zIndex: 1000,
          }}
          size="small"
        >
          <div className="text-sm">
            <div className="mb-2">マーカーを読み込み中...</div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${renderProgress}%` }}
              ></div>
            </div>
            <div className="text-xs text-gray-600 mt-1 text-right">
              {renderProgress}%
            </div>
          </div>
        </Card>
      )}

      {/* 統計情報（画面右上） */}
      {statistics && !loading && renderProgress === 100 && (
        <Card
          title="統計情報"
          style={{
            position: "absolute",
            top: 80,
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

      {/* 凡例（画面右上、統計情報の下） */}
      {!loading && renderProgress === 100 && (
        <Card
          title="凡例"
          style={{
            position: "absolute",
            top: 360,
            right: 16,
            width: 280,
            zIndex: 1000,
          }}
          size="small"
        >
          <div className="space-y-3 text-xs">
            {/* 品種の色（塗りつぶし） */}
            <div>
              <div className="font-semibold text-gray-700 mb-2">
                品種（塗りつぶし）
              </div>
              <div className="space-y-1">
                {Object.entries(VARIETY_COLORS).map(([variety, color]) => (
                  <div key={variety} className="flex items-center gap-2">
                    <div
                      style={{
                        backgroundColor: color,
                        width: 16,
                        height: 16,
                        borderRadius: "50%",
                        border: "2px solid #666",
                      }}
                    />
                    <span className="text-gray-700">{variety}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 組織の色（枠線） */}
            {organizationStats.length > 0 && (
              <div>
                <div className="font-semibold text-gray-700 mb-2">
                  組織（枠線）
                </div>
                <div className="space-y-1">
                  {organizationStats.map((org, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        style={{
                          backgroundColor: "#FFF",
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          border: `3px solid ${org.color}`,
                        }}
                      />
                      <span className="text-gray-700">
                        {org.organizationName}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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

            {/* 作物情報（全作期） */}
            {selectedFarmland.ownershipInfoList &&
              selectedFarmland.ownershipInfoList.length > 0 && (
                <div className="border-t pt-3 mt-4">
                  <div className="text-gray-600 font-semibold mb-2">
                    作物情報:
                  </div>
                  <div className="space-y-2">
                    {selectedFarmland.ownershipInfoList.map(
                      (cropData, index) => (
                        <div
                          key={index}
                          className="bg-blue-50 p-3 rounded border border-blue-200"
                        >
                          <div className="space-y-1 text-sm">
                            <div>
                              <span className="text-gray-600">作期：</span>
                              <span className="text-gray-900 font-medium">
                                {cropData.sakki === "1"
                                  ? "表作"
                                  : cropData.sakki === "2"
                                  ? "裏作"
                                  : cropData.sakki || "不明"}
                              </span>
                            </div>
                            {cropData.cropCategory && (
                              <div>
                                <span className="text-gray-600">
                                  作物分類：
                                </span>
                                <span className="text-gray-900 font-medium">
                                  {cropData.cropCategory}
                                </span>
                              </div>
                            )}
                            {cropData.variety && (
                              <div>
                                <span className="text-gray-600">品種：</span>
                                <span className="text-gray-900 font-medium">
                                  {cropData.variety}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

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
