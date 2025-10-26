"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Button, Input, Form, message } from "antd";

// Leafletのデフォルトアイコンを修正
if (typeof window !== "undefined") {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
    iconUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
    shadowUrl:
      "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  });
}

export default function AddPinPage() {
  const mapRef = useRef<L.Map | null>(null);
  const polygonsRef = useRef<L.LayerGroup | null>(null);
  const [currentMarker, setCurrentMarker] = useState<L.Marker | null>(null);
  const [form] = Form.useForm();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [unmatchedCount, setUnmatchedCount] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined" || mapRef.current) return;

    const initMap = async () => {
      // 地図の初期化
      mapRef.current = L.map("add-pin-map", {
        center: [33.082281575000025, 130.47120210700007],
        zoom: 14,
        zoomControl: true,
      });

      // 航空写真タイルレイヤーの追加
      L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        {
          attribution: "© Esri",
          maxZoom: 19,
        }
      ).addTo(mapRef.current);

      // ポリゴングループの初期化
      polygonsRef.current = L.layerGroup().addTo(mapRef.current);

      // 未マッチポリゴンをロードして表示
      try {
        setLoading(true);

        // GeoJSONとPolygonデータを読み込む
        const [pinResponse, polygonResponse] = await Promise.all([
          fetch("/data/hinashiro_pin.geojson"),
          fetch("/data/hinashiro_polygon.geojson"),
        ]);

        const pinData = await pinResponse.json();
        const polygonData = await polygonResponse.json();

        // point-in-polygon判定用にTurfをインポート
        const turf = await import("@turf/turf");

        // 各ポリゴンがピンとマッチしているかチェック
        let unmatchedPolygons = 0;

        polygonData.features.forEach((polygon: any) => {
          let hasMatch = false;

          // このポリゴン内にピンがあるかチェック
          for (const pin of pinData.features) {
            const point = turf.point(pin.geometry.coordinates);
            if (turf.booleanPointInPolygon(point, polygon)) {
              hasMatch = true;
              break;
            }
          }

          // マッチしていないポリゴンを表示
          if (!hasMatch) {
            unmatchedPolygons++;
            const polygonLayer = L.polygon(
              polygon.geometry.coordinates[0].map((coord: number[]) => [
                coord[1],
                coord[0],
              ]),
              {
                color: "#FF6B6B",
                fillColor: "#FF6B6B",
                fillOpacity: 0.25,
                weight: 2,
                dashArray: "5, 5",
              }
            );

            const tooltipContent = `
              <div class="text-xs">
                <div class="font-semibold text-red-600">未マッチポリゴン</div>
                <div class="text-gray-600">ここにピンを追加してください</div>
                <div class="text-gray-500 text-xs">ID: ${
                  polygon.properties.polygon_uuid || "N/A"
                }</div>
              </div>
            `;

            polygonLayer.bindTooltip(tooltipContent, {
              direction: "top",
              opacity: 0.9,
            });

            polygonLayer.on("click", (e) => {
              // ポリゴンクリック時はイベントを停止しない（地図のクリックイベントも発火させる）
            });

            polygonsRef.current?.addLayer(polygonLayer);
          }
        });

        setUnmatchedCount(unmatchedPolygons);
        message.success(
          `${unmatchedPolygons}個の未マッチポリゴンを表示しました`
        );
      } catch (error) {
        console.error("Failed to load polygons:", error);
        message.error("ポリゴンデータの読み込みに失敗しました");
      } finally {
        setLoading(false);
      }

      // 地図クリックイベント
      mapRef.current.on("click", (e) => {
        const { lat, lng } = e.latlng;

        // 既存のマーカーを削除
        if (currentMarker) {
          currentMarker.remove();
        }

        // 新しいマーカーを追加
        const marker = L.marker([lat, lng]).addTo(mapRef.current!);
        setCurrentMarker(marker);
        setPosition([lat, lng]);

        // フォームに座標を設定
        form.setFieldsValue({
          latitude: lat.toFixed(8),
          longitude: lng.toFixed(8),
        });

        message.info(`座標: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      });
    };

    initMap();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (polygonsRef.current) {
        polygonsRef.current.clearLayers();
      }
    };
  }, []);

  const handleSubmit = async (values: any) => {
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
    if (currentMarker) {
      currentMarker.remove();
    }
    setCurrentMarker(null);
    setPosition(null);
  };

  return (
    <div className="h-screen flex flex-col">
      {/* ヘッダー */}
      <div className="bg-white shadow p-4">
        <h1 className="text-2xl font-bold">ピン追加ツール</h1>
        <p className="text-gray-600 text-sm">
          赤いポリゴン（未マッチ）をクリックして位置を選択し、住所情報を入力してください
        </p>
        {!loading && unmatchedCount > 0 && (
          <div className="mt-2 inline-block px-3 py-1 bg-red-100 text-red-700 rounded text-sm">
            未マッチポリゴン: {unmatchedCount}個
          </div>
        )}
      </div>

      <div className="flex-1 flex">
        {/* 地図エリア */}
        <div className="flex-1 relative">
          <div id="add-pin-map" className="absolute inset-0" />

          {loading && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-[1000]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">未マッチポリゴンを読み込み中...</p>
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
