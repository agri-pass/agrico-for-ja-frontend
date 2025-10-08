'use client';

import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { FarmlandFeature } from '@/types';
import { dataService } from '@/services/dataService';
import { formatArea } from '@/lib/utils';

// Leafletのデフォルトアイコンを修正
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Props {
  farmlands: Array<FarmlandFeature & {isCollectiveOwned: boolean}>;
  loading: boolean;
  statistics: any;
  organizationStats: any[];
}

export default function MapContent({ farmlands, loading, statistics, organizationStats }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<L.LayerGroup | null>(null);
  const [selectedFarmland, setSelectedFarmland] = useState<any>(null);
  
  // みやま市の中心座標
  const MIYAMA_CENTER: [number, number] = [33.1525, 130.4544];
  const DEFAULT_ZOOM = 13;

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 地図の初期化
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        center: MIYAMA_CENTER,
        zoom: DEFAULT_ZOOM,
        zoomControl: true,
      });

      // 航空写真タイルレイヤーの追加（Esri World Imagery）
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: '© <a href="https://www.esri.com/">Esri</a>, © <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 19,
      }).addTo(mapRef.current);

      // マーカーグループの初期化
      markersRef.current = L.layerGroup().addTo(mapRef.current);
    }

    // クリーンアップ関数
    return () => {
      if (markersRef.current) {
        markersRef.current.clearLayers();
      }
    };
  }, []);

  // 農地マーカーの更新
  useEffect(() => {
    if (!mapRef.current || !markersRef.current || loading || farmlands.length === 0) {
      return;
    }

    // 既存のマーカーをクリア
    markersRef.current.clearLayers();

    // 各農地にマーカーを追加
    farmlands.forEach(farmland => {
      const { geometry, properties, isCollectiveOwned } = farmland;
      const [lng, lat] = geometry.coordinates;
      
      // 組織に基づいて色を決定
      const color = dataService.getFarmlandColor(properties.DaichoId);
      
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
            ${isCollectiveOwned ? 'border-width: 3px; border-color: #000;' : ''}
          "></div>
        `,
        className: 'custom-farmland-marker',
        iconSize: [16, 16],
        iconAnchor: [8, 8],
      });

      // マーカーを作成
      const marker = L.marker([lat, lng], { icon })
        .on('click', () => {
          const details = dataService.getFarmlandDetails(properties.DaichoId);
          setSelectedFarmland(details);
        });

      // ツールチップの追加
      const tooltipContent = `
        <div class="text-xs">
          <div class="font-semibold">${properties.Address}</div>
          <div class="text-gray-600">地番: ${properties.Tiban}</div>
          <div class="text-gray-600">面積: ${formatArea(properties.AreaOnRegistry)}</div>
          <div class="text-gray-600">区分: ${properties.ClassificationOfLandCodeName}</div>
          ${isCollectiveOwned ? '<div class="text-red-600 font-semibold">集落営農法人</div>' : ''}
        </div>
      `;
      
      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -10],
        opacity: 0.9,
      });

      // マーカーグループに追加
      markersRef.current?.addLayer(marker);
    });

    console.log(`Added ${farmlands.length} markers to map`);
  }, [farmlands, loading]);

  return (
    <>
      <div id="map" className="w-full h-full" />
      
      {/* 凡例 */}
      <div className="absolute bottom-4 left-4 bg-white p-4 rounded-lg shadow-lg z-[1000] max-w-xs">
        <h3 className="font-bold text-gray-800 mb-2">凡例</h3>
        <div className="space-y-2 text-sm">
          {/* 組織別凡例 */}
          {organizationStats.map((org, index) => (
            <div key={index} className="flex items-center">
              <div 
                className="w-4 h-4 rounded-full border-2 border-black mr-2"
                style={{ backgroundColor: org.color }}
              ></div>
              <span>{org.organizationName}</span>
            </div>
          ))}
          <div className="flex items-center">
            <div className="w-4 h-4 rounded-full bg-teal-400 border-2 border-white mr-2"></div>
            <span>その他農地</span>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            ※ マーカーをクリックで詳細表示
          </div>
        </div>
      </div>

      {/* 農地詳細ポップアップ */}
      {selectedFarmland && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-2xl z-[1001] max-w-md w-full mx-4">
          <div className="flex justify-between items-start mb-4">
            <h3 className="font-bold text-lg text-gray-800">農地詳細</h3>
            <button
              onClick={() => setSelectedFarmland(null)}
              className="text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="space-y-3">
            {/* 基本情報 */}
            <div>
              <label className="text-sm font-semibold text-gray-600">住所</label>
              <p className="text-gray-800">{selectedFarmland.feature.properties.Address}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-semibold text-gray-600">地番</label>
                <p className="text-gray-800">{selectedFarmland.feature.properties.Tiban}</p>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600">面積</label>
                <p className="text-gray-800">{formatArea(selectedFarmland.feature.properties.AreaOnRegistry)}</p>
              </div>
            </div>
            
            <div>
              <label className="text-sm font-semibold text-gray-600">農地区分</label>
              <p className="text-gray-800">{selectedFarmland.feature.properties.ClassificationOfLandCodeName}</p>
            </div>
            
            {/* 所有形態 */}
            <div>
              <label className="text-sm font-semibold text-gray-600">所有形態</label>
              <div className="flex items-center mt-1">
                {selectedFarmland.isCollectiveOwned ? (
                  <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-semibold">
                    {selectedFarmland.ownershipInfo?.organizationName || '集落営農法人'}
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-sm font-semibold">
                    その他農地
                  </span>
                )}
              </div>
            </div>

            {/* 集落営農法人の場合の追加情報 */}
            {selectedFarmland.ownershipInfo && (
              <div className="border-t pt-3">
                <label className="text-sm font-semibold text-gray-600">マッチング情報</label>
                <div className="text-sm text-gray-700 mt-1">
                  <p>大字: {selectedFarmland.ownershipInfo.oaza}</p>
                  <p>小字: {selectedFarmland.ownershipInfo.koaza}</p>
                  <p>地番: {selectedFarmland.ownershipInfo.chiban}</p>
                </div>
              </div>
            )}
            
            {/* 技術情報（開発用） */}
            <div className="border-t pt-3 text-xs text-gray-500">
              <p>ID: {selectedFarmland.feature.properties.DaichoId}</p>
              <p>座標: {selectedFarmland.feature.geometry.coordinates.join(', ')}</p>
            </div>
          </div>
        </div>
      )}

      {/* 背景オーバーレイ（ポップアップ表示時） */}
      {selectedFarmland && (
        <div 
          className="absolute inset-0 bg-black bg-opacity-50 z-[1000]"
          onClick={() => setSelectedFarmland(null)}
        />
      )}
    </>
  );
}