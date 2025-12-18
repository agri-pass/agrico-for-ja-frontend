"use client";

import { useState, useRef, useEffect } from "react";
import { Button, Input, Form, message, Select } from "antd";
import type L from "leaflet";

// SSGを無効化（Leafletはクライアントサイドのみで動作）
export const dynamic = "force-dynamic";

// 利用可能な地域データの定義
const REGIONS = [
  {
    id: "hinashiro",
    name: "ひなしろ",
    pinFile: "/data/hinashiro_pin.geojson",
    polygonFile: "/data/hinashiro_polygon.geojson",
    center: [33.082281575000025, 130.47120210700007] as [number, number],
  },
  {
    id: "taisenji",
    name: "泰仙寺",
    pinFile: "/data/taisenji_pin.geojson",
    polygonFile: "/data/taisenji_polygon.geojson",
    center: [33.15, 130.52] as [number, number],
  },
  {
    id: "miyazaki",
    name: "宮崎",
    pinFile: "/data/miyazaki_pin.geojson",
    polygonFile: "/data/miyazaki_polygon.geojson",
    center: [31.9, 131.4] as [number, number],
  },
  {
    id: "asakura",
    name: "朝倉",
    pinFile: "/data/asakura_pin.geojson",
    polygonFile: null, // ポリゴンデータなし
    center: [33.4, 130.8] as [number, number],
  },
];

export default function AddPinPage() {
  const mapRef = useRef<unknown>(null);
  const polygonsRef = useRef<unknown>(null);
  const [currentMarker, setCurrentMarker] = useState<unknown>(null);
  const [form] = Form.useForm();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(false);
  const [unmatchedCount, setUnmatchedCount] = useState(0);
  const [mapInitialized, setMapInitialized] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [uploadedPinFileName, setUploadedPinFileName] = useState<string | null>(
    null
  );
  const [uploadedPolygonFileName, setUploadedPolygonFileName] = useState<
    string | null
  >(null);
  const pinFileInputRef = useRef<HTMLInputElement>(null);
  const polygonFileInputRef = useRef<HTMLInputElement>(null);
  const pinDataRef = useRef<GeoJSON.FeatureCollection | null>(null);
  const polygonDataRef = useRef<GeoJSON.FeatureCollection | null>(null);

  // 地図初期化
  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    const initMap = async () => {
      // Leafletを動的にインポート
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

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

      // 地図の初期化
      const map = L.map("add-pin-map", {
        center: [33.082281575000025, 130.47120210700007],
        zoom: 14,
        zoomControl: true,
      });
      mapRef.current = map;

      // 航空写真タイルレイヤーの追加
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxZoom: 19,
        }
      ).addTo(map);

      // ポリゴングループの初期化
      const polygons = L.layerGroup().addTo(map);
      polygonsRef.current = polygons;

      // 地図クリックイベント
      map.on("click", (e) => {
        const { lat, lng } = e.latlng;

        // 既存のマーカーを削除
        const prevMarker = currentMarker as L.Marker | null;
        if (prevMarker) {
          prevMarker.remove();
        }

        // 新しいマーカーを追加
        const marker = L.marker([lat, lng]).addTo(map);
        setCurrentMarker(marker);
        setPosition([lat, lng]);

        // フォームに座標を設定
        form.setFieldsValue({
          latitude: lat.toFixed(8),
          longitude: lng.toFixed(8),
        });

        message.info(`座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });

      setMapInitialized(true);
    };

    initMap();

    return () => {
      const map = mapRef.current as L.Map | null;
      const polygons = polygonsRef.current as L.LayerGroup | null;

      if (map) {
        map.remove();
        mapRef.current = null;
      }
      if (polygons) {
        polygons.clearLayers();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ピンファイルアップロードハンドラー
  const handlePinUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(
          e.target?.result as string
        ) as GeoJSON.FeatureCollection;
        pinDataRef.current = data;
        setUploadedPinFileName(file.name);
        message.success(
          `ピンデータ ${file.name}: ${data.features.length}件を読み込みました`
        );
      } catch (error) {
        console.error("Failed to parse pin GeoJSON:", error);
        message.error("ピンGeoJSONの解析に失敗しました");
      }
    };
    reader.readAsText(file);
  };

  // ポリゴンファイルアップロードハンドラー
  const handlePolygonUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(
          e.target?.result as string
        ) as GeoJSON.FeatureCollection;
        polygonDataRef.current = data;
        setUploadedPolygonFileName(file.name);
        message.success(
          `ポリゴンデータ ${file.name}: ${data.features.length}件を読み込みました`
        );
      } catch (error) {
        console.error("Failed to parse polygon GeoJSON:", error);
        message.error("ポリゴンGeoJSONの解析に失敗しました");
      }
    };
    reader.readAsText(file);
  };

  // 地域選択ハンドラー
  const handleRegionSelect = async (regionId: string) => {
    const region = REGIONS.find((r) => r.id === regionId);
    if (!region) return;

    setLoading(true);
    setSelectedRegion(regionId);

    // 既存のデータをクリア
    pinDataRef.current = null;
    polygonDataRef.current = null;
    setUploadedPinFileName(null);
    setUploadedPolygonFileName(null);
    setUnmatchedCount(0);

    const polygons = polygonsRef.current as L.LayerGroup | null;
    if (polygons) {
      polygons.clearLayers();
    }

    try {
      // ピンデータを読み込み
      const pinResponse = await fetch(region.pinFile);
      if (pinResponse.ok) {
        const pinData = (await pinResponse.json()) as GeoJSON.FeatureCollection;
        pinDataRef.current = pinData;
        setUploadedPinFileName(region.pinFile.split("/").pop() || null);
        message.success(
          `ピンデータ: ${pinData.features.length}件を読み込みました`
        );
      }

      // ポリゴンデータを読み込み（存在する場合）
      if (region.polygonFile) {
        const polygonResponse = await fetch(region.polygonFile);
        if (polygonResponse.ok) {
          const polygonData =
            (await polygonResponse.json()) as GeoJSON.FeatureCollection;
          polygonDataRef.current = polygonData;
          setUploadedPolygonFileName(region.polygonFile.split("/").pop() || null);
          message.success(
            `ポリゴンデータ: ${polygonData.features.length}件を読み込みました`
          );
        }
      } else {
        message.info("この地域にはポリゴンデータがありません");
      }

      // 地図の中心を移動
      const map = mapRef.current as L.Map | null;
      if (map && region.center) {
        map.setView(region.center, 14);
      }
    } catch (error) {
      console.error("Failed to load region data:", error);
      message.error("地域データの読み込みに失敗しました");
    } finally {
      setLoading(false);
    }
  };

  // マッチング実行
  const runMatching = async () => {
    if (!pinDataRef.current || !polygonDataRef.current) {
      message.error("ピンデータとポリゴンデータを両方アップロードしてください");
      return;
    }

    const polygons = polygonsRef.current as L.LayerGroup | null;
    if (!polygons) return;

    setLoading(true);
    polygons.clearLayers();

    try {
      const L = (await import("leaflet")).default;
      const turf = await import("@turf/turf");

      const pinData = pinDataRef.current;
      const polygonData = polygonDataRef.current;

      let unmatchedPolygons = 0;

      polygonData.features.forEach((feature) => {
        // Polygonタイプのみ処理
        if (feature.geometry.type !== "Polygon") return;

        const polygon = feature as GeoJSON.Feature<GeoJSON.Polygon>;
        let hasMatch = false;

        for (const pin of pinData.features) {
          if (pin.geometry.type === "Point") {
            const point = turf.point(
              (pin.geometry as GeoJSON.Point).coordinates
            );
            if (turf.booleanPointInPolygon(point, polygon)) {
              hasMatch = true;
              break;
            }
          }
        }

        if (!hasMatch) {
          unmatchedPolygons++;
          const coords = (polygon.geometry.coordinates[0] as number[][]).map(
            (coord) => [coord[1], coord[0]] as [number, number]
          );
          const polygonLayer = L.polygon(coords, {
            color: "#FF6B6B",
            fillColor: "#FF6B6B",
            fillOpacity: 0.25,
            weight: 2,
            dashArray: "5, 5",
          });

          const tooltipContent = `
            <div class="text-xs">
              <div class="font-semibold text-red-600">未マッチポリゴン</div>
              <div class="text-gray-600">ここにピンを追加してください</div>
              <div class="text-gray-500 text-xs">ID: ${
                polygon.properties?.polygon_uuid || "N/A"
              }</div>
            </div>
          `;

          polygonLayer.bindTooltip(tooltipContent, {
            direction: "top",
            opacity: 0.9,
          });

          polygons.addLayer(polygonLayer);
        }
      });

      setUnmatchedCount(unmatchedPolygons);
      message.success(`${unmatchedPolygons}個の未マッチポリゴンを表示しました`);
    } catch (error) {
      console.error("Matching failed:", error);
      message.error("マッチング処理に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: {
    address?: string;
    tiban?: string;
    area?: string;
    classification?: string;
  }) => {
    if (!position) {
      message.error("地図上でピンの位置をクリックしてください");
      return;
    }

    const newFeature = {
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [position[1], position[0]], // [lng, lat]
      },
      properties: {
        Address: values.address || "",
        Tiban: values.tiban || "",
        AreaOnRegistry: values.area || "",
        ClassificationOfLandCodeName: values.classification || "田",
        DaichoId: `manual_${Date.now()}`,
        FarmerIndicationNumberHash: `hash_${Date.now()}`,
      },
    };

    console.log("New Feature:", newFeature);

    // GeoJSON形式で出力
    const geojsonString = JSON.stringify(newFeature, null, 2);

    // ダウンロード用のBlob作成
    const blob = new Blob([geojsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pin_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    message.success(
      "GeoJSONファイルをダウンロードしました。手動でpin.geojsonに追加してください。"
    );

    // フォームをリセット
    form.resetFields();
    const marker = currentMarker as L.Marker | null;
    if (marker) {
      marker.remove();
    }
    setCurrentMarker(null);
    setPosition(null);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-2xl font-bold">ピン追加ツール</h1>
            <p className="text-gray-600 text-sm">
              ピンとポリゴンデータをアップロードして、未マッチポリゴンを確認できます
            </p>
          </div>
          {!loading && unmatchedCount > 0 && (
            <div className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
              未マッチポリゴン: {unmatchedCount}個
            </div>
          )}
        </div>

        {/* データ選択コントロール */}
        <div className="flex flex-wrap gap-3 items-center mt-3 p-3 bg-gray-50 rounded">
          {/* 地域プルダウン */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 font-medium">地域選択:</span>
            <Select
              placeholder="地域を選択"
              value={selectedRegion}
              onChange={handleRegionSelect}
              disabled={loading || !mapInitialized}
              style={{ width: 150 }}
              allowClear
              onClear={() => {
                setSelectedRegion(null);
                pinDataRef.current = null;
                polygonDataRef.current = null;
                setUploadedPinFileName(null);
                setUploadedPolygonFileName(null);
                setUnmatchedCount(0);
                const polygons = polygonsRef.current as L.LayerGroup | null;
                if (polygons) polygons.clearLayers();
              }}
              options={REGIONS.map((r) => ({
                value: r.id,
                label: r.name,
              }))}
            />
          </div>

          <div className="border-l border-gray-300 h-8 mx-2" />

          {/* ピンファイルアップロード */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={pinFileInputRef}
              accept=".json,.geojson"
              onChange={handlePinUpload}
              className="hidden"
            />
            <Button
              onClick={() => pinFileInputRef.current?.click()}
              disabled={loading || !mapInitialized}
              size="small"
            >
              ピンアップロード
            </Button>
            {uploadedPinFileName ? (
              <span className="text-sm text-blue-600 font-medium">
                {uploadedPinFileName}
              </span>
            ) : (
              <span className="text-sm text-gray-400">未読み込み</span>
            )}
          </div>

          {/* ポリゴンファイルアップロード */}
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={polygonFileInputRef}
              accept=".json,.geojson"
              onChange={handlePolygonUpload}
              className="hidden"
            />
            <Button
              onClick={() => polygonFileInputRef.current?.click()}
              disabled={loading || !mapInitialized}
              size="small"
            >
              ポリゴンアップロード
            </Button>
            {uploadedPolygonFileName ? (
              <span className="text-sm text-purple-600 font-medium">
                {uploadedPolygonFileName}
              </span>
            ) : (
              <span className="text-sm text-gray-400">未読み込み</span>
            )}
          </div>

          {/* マッチング実行ボタン */}
          <Button
            type="primary"
            onClick={runMatching}
            disabled={
              loading || !uploadedPinFileName || !uploadedPolygonFileName
            }
            loading={loading}
          >
            マッチング実行
          </Button>
        </div>
      </div>

      <div className="flex-1 flex">
        {/* 地図エリア */}
        <div className="flex-1 relative">
          <div id="add-pin-map" className="absolute inset-0" />

          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">マッチング処理中...</p>
              </div>
            </div>
          )}

          {!loading &&
            !uploadedPinFileName &&
            !uploadedPolygonFileName &&
            mapInitialized && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center z-[500]">
                <div className="text-center p-6 bg-white rounded-lg shadow-lg">
                  <p className="text-gray-700 font-semibold mb-2">
                    データを読み込んでください
                  </p>
                  <p className="text-gray-500 text-sm">
                    地域を選択するか、ファイルをアップロードしてください
                  </p>
                </div>
              </div>
            )}
        </div>

        {/* フォームエリア */}
        <div className="w-96 bg-white p-6 shadow-lg overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">農地情報入力</h2>

          {position && (
            <div className="mb-4 p-3 bg-blue-50 rounded">
              <div className="text-sm font-semibold text-blue-800">
                選択位置
              </div>
              <div className="text-xs text-blue-600">
                緯度: {position[0].toFixed(6)}
                <br />
                経度: {position[1].toFixed(6)}
              </div>
            </div>
          )}

          <Form form={form} layout="vertical" onFinish={handleSubmit}>
            <Form.Item
              label="住所"
              name="address"
              rules={[{ required: true, message: "住所を入力してください" }]}
            >
              <Input placeholder="福岡県みやま市..." />
            </Form.Item>

            <Form.Item
              label="地番"
              name="tiban"
              rules={[{ required: true, message: "地番を入力してください" }]}
            >
              <Input placeholder="例: 123-4" />
            </Form.Item>

            <Form.Item label="面積（㎡）" name="area">
              <Input type="number" placeholder="例: 1000" />
            </Form.Item>

            <Form.Item label="農地区分" name="classification">
              <Input placeholder="例: 田、畑" />
            </Form.Item>

            <Form.Item label="緯度" name="latitude">
              <Input disabled />
            </Form.Item>

            <Form.Item label="経度" name="longitude">
              <Input disabled />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" block size="large">
                GeoJSONをダウンロード
              </Button>
            </Form.Item>
          </Form>

          <div className="mt-6 p-4 bg-yellow-50 rounded border border-yellow-200">
            <h3 className="font-semibold text-sm mb-2">使い方</h3>
            <ol className="text-xs space-y-1 list-decimal list-inside text-gray-700">
              <li>
                <strong>赤い点線のポリゴン</strong>が未マッチポリゴンです
              </li>
              <li>ポリゴン内でクリックして位置を選択</li>
              <li>住所・地番などの情報を入力</li>
              <li>「GeoJSONをダウンロード」をクリック</li>
              <li>ダウンロードしたファイルを開く</li>
              <li>内容をコピーして、pin.geojsonのfeatures配列に追加</li>
            </ol>
          </div>

          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <h3 className="font-semibold text-sm mb-2">凡例</h3>
            <div className="text-xs space-y-1">
              <div className="flex items-center">
                <div className="w-4 h-4 border-2 border-red-500 border-dashed bg-red-500 bg-opacity-25 mr-2"></div>
                <span>未マッチポリゴン（ピンを追加が必要）</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
