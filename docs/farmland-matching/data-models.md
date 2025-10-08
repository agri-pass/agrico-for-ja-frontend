# 農地管理システム データモデル定義書

## 📊 データモデル概要

農地管理システムで使用する主要なデータモデルとその関係性を定義します。

## 🗺 地理データモデル

### GeoJSON形式
本システムではGeoJSON標準に準拠した地理データを使用します。

```typescript
// GeoJSON基本型
type GeoJSONType = 'Point' | 'LineString' | 'Polygon' | 'MultiPolygon';

interface GeoJSONGeometry<T = any> {
  type: GeoJSONType;
  coordinates: T;
}

interface GeoJSONFeature<G = any, P = any> {
  type: 'Feature';
  geometry: G;
  properties: P;
}

interface GeoJSONFeatureCollection<F = any> {
  type: 'FeatureCollection';
  features: F[];
}
```

## 🌾 農地データモデル

### Farmland (農地)
```typescript
interface Farmland {
  // 識別子
  id: string;                          // 農地ID (UUID)
  code: string;                         // 農地管理番号
  
  // 地理情報
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][];         // [経度, 緯度]の配列
  };
  
  // 中心点（ピン表示用）
  center: {
    lat: number;                        // 緯度
    lng: number;                        // 経度
  };
  
  // 境界ボックス（検索最適化用）
  bbox: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
  };
  
  // 基本情報
  properties: FarmlandProperties;
  
  // メタデータ
  metadata: {
    createdAt: Date;                    // 作成日時
    updatedAt: Date;                    // 更新日時
    version: number;                    // データバージョン
  };
}

interface FarmlandProperties {
  // 所在地情報
  location: {
    prefecture: string;                 // 都道府県
    city: string;                       // 市区町村
    district: string;                   // 大字
    address: string;                    // 詳細住所
    lotNumber: string;                  // 地番
    postalCode?: string;                // 郵便番号
  };
  
  // 農地情報
  landInfo: {
    area: number;                       // 面積（㎡）
    landType: LandType;                 // 農地区分
    soilType?: SoilType;                // 土壌種別
    waterAccess: boolean;               // 水利権有無
    sunlightCondition: SunlightLevel;   // 日照条件
  };
  
  // 耕作者情報
  farmer: {
    id: string;                         // 耕作者ID
    name: string;                       // 耕作者名
    organizationId?: string;            // 所属組織ID
  };
  
  // 作物情報
  crops: Crop[];                       // 作物リスト
  
  // 管理情報
  management: {
    status: FarmlandStatus;             // 農地状態
    lastInspectionDate?: Date;          // 最終調査日
    notes?: string;                     // 備考
  };
}
```

### 農地区分 (LandType)
```typescript
enum LandType {
  RICE_FIELD = '田',        // 水田
  DRY_FIELD = '畑',         // 畑
  ORCHARD = '樹園地',       // 果樹園
  PASTURE = '牧草地',       // 牧草地
  GREENHOUSE = 'ハウス',     // 温室・ハウス
  OTHER = 'その他'          // その他
}
```

### 農地状態 (FarmlandStatus)
```typescript
enum FarmlandStatus {
  ACTIVE = 'active',              // 耕作中
  FALLOW = 'fallow',              // 休耕中
  ABANDONED = 'abandoned',        // 耕作放棄地
  CONVERSION = 'conversion',      // 転用予定
  UNKNOWN = 'unknown'             // 不明
}
```

## 👨‍🌾 耕作者データモデル

### Farmer (耕作者)
```typescript
interface Farmer {
  id: string;                     // 耕作者ID
  name: string;                   // 氏名
  kanaName?: string;              // カナ氏名
  
  // 連絡先
  contact: {
    phone?: string;               // 電話番号
    email?: string;               // メールアドレス
    address?: string;             // 住所
  };
  
  // 組織情報
  organization?: {
    id: string;                   // 組織ID
    name: string;                 // 組織名
    role?: string;                // 役職
  };
  
  // 農地情報
  farmlands: {
    count: number;                // 管理農地数
    totalArea: number;            // 総面積（㎡）
    farmlandIds: string[];        // 農地IDリスト
  };
  
  // 表示設定
  display: {
    color: string;                // 地図表示色（HEX）
    icon?: string;                // アイコン
    priority: number;             // 表示優先度
  };
  
  // メタデータ
  metadata: {
    registeredAt: Date;           // 登録日
    lastActiveAt?: Date;          // 最終活動日
    status: FarmerStatus;         // 状態
  };
}

enum FarmerStatus {
  ACTIVE = 'active',              // 活動中
  INACTIVE = 'inactive',          // 非活動
  RETIRED = 'retired'            // 引退
}
```

## 🌱 作物データモデル

### Crop (作物)
```typescript
interface Crop {
  id: string;                     // 作物ID
  name: string;                   // 作物名
  category: CropCategory;         // 作物カテゴリ
  
  // 栽培情報
  cultivation: {
    plantingDate?: Date;          // 作付日
    harvestDate?: Date;           // 収穫予定日
    actualHarvestDate?: Date;     // 実収穫日
    area: number;                 // 作付面積（㎡）
    yield?: number;               // 収量（kg）
  };
  
  // 品種情報
  variety?: {
    name: string;                 // 品種名
    characteristics?: string[];   // 特徴
  };
  
  status: CropStatus;             // 栽培状態
}

enum CropCategory {
  GRAIN = '穀物',                 // 米、麦など
  VEGETABLE = '野菜',             // 野菜類
  FRUIT = '果物',                 // 果物類
  FLOWER = '花卉',                // 花き類
  OTHER = 'その他'                // その他
}

enum CropStatus {
  PLANNED = 'planned',            // 計画中
  GROWING = 'growing',            // 生育中
  HARVESTED = 'harvested',        // 収穫済
  FAILED = 'failed'              // 失敗
}
```

## 📊 統計データモデル

### Statistics (統計情報)
```typescript
interface Statistics {
  // 概要統計
  overview: {
    totalFarmlands: number;       // 総農地数
    totalArea: number;            // 総面積（㎡）
    totalFarmers: number;         // 総耕作者数
    averageAreaPerFarmland: number; // 平均面積
  };
  
  // 農地区分別統計
  byLandType: {
    type: LandType;
    count: number;
    area: number;
    percentage: number;           // 全体に対する割合（%）
  }[];
  
  // 耕作者別統計
  byFarmer: {
    farmerId: string;
    farmerName: string;
    farmlandCount: number;
    totalArea: number;
    percentage: number;
  }[];
  
  // 作物別統計
  byCrop: {
    cropCategory: CropCategory;
    count: number;
    area: number;
    percentage: number;
  }[];
  
  // 地区別統計
  byDistrict: {
    district: string;
    farmlandCount: number;
    area: number;
    farmerCount: number;
  }[];
  
  // 時系列データ
  timeline?: {
    date: Date;
    activeFarmlands: number;
    fallowFarmlands: number;
    totalArea: number;
  }[];
  
  // 集計日時
  calculatedAt: Date;
}
```

## 🔍 検索・フィルタモデル

### SearchCriteria (検索条件)
```typescript
interface SearchCriteria {
  // テキスト検索
  keyword?: string;               // キーワード
  
  // 位置検索
  location?: {
    address?: string;             // 住所
    lotNumber?: string;           // 地番
    bounds?: {                   // 境界ボックス
      north: number;
      south: number;
      east: number;
      west: number;
    };
    radius?: {                    // 半径検索
      center: [number, number];   // [緯度, 経度]
      distance: number;           // 距離（m）
    };
  };
  
  // 属性フィルタ
  filters?: {
    farmerIds?: string[];         // 耕作者ID
    landTypes?: LandType[];       // 農地区分
    statuses?: FarmlandStatus[];  // 農地状態
    cropCategories?: CropCategory[]; // 作物カテゴリ
    areaRange?: {                 // 面積範囲
      min?: number;
      max?: number;
    };
  };
  
  // ソート条件
  sort?: {
    field: 'area' | 'updatedAt' | 'farmerName';
    order: 'asc' | 'desc';
  };
  
  // ページネーション
  pagination?: {
    page: number;
    limit: number;
  };
}

interface SearchResult {
  items: Farmland[];              // 検索結果
  totalCount: number;             // 総件数
  page: number;                   // 現在ページ
  pageCount: number;              // 総ページ数
  facets?: {                     // ファセット情報
    landTypes: { type: LandType; count: number }[];
    farmers: { id: string; name: string; count: number }[];
  };
}
```

## 🎨 表示設定モデル

### MapDisplaySettings (地図表示設定)
```typescript
interface MapDisplaySettings {
  // 表示レイヤー
  layers: {
    farmlands: boolean;           // 農地ポリゴン
    pins: boolean;                // ピンマーカー
    labels: boolean;              // ラベル
    grid: boolean;                // グリッド
  };
  
  // スタイル設定
  style: {
    polygonOpacity: number;       // ポリゴン透明度 (0-1)
    strokeWidth: number;          // 境界線幅
    strokeColor: string;          // 境界線色
    labelSize: 'small' | 'medium' | 'large';
  };
  
  // 色分け設定
  colorScheme: {
    type: 'farmer' | 'landType' | 'status' | 'custom';
    colors?: Record<string, string>; // カスタムカラーマップ
  };
  
  // パフォーマンス設定
  performance: {
    maxPolygons: number;          // 最大表示ポリゴン数
    clusterMarkers: boolean;      // マーカークラスタリング
    simplifyPolygons: boolean;    // ポリゴン簡略化
  };
  
  // ビュー設定
  view: {
    center: [number, number];     // 中心座標 [緯度, 経度]
    zoom: number;                 // ズームレベル
    bounds?: [[number, number], [number, number]]; // 表示範囲
  };
}
```

## 📱 ユーザー設定モデル

### UserPreferences (ユーザー設定)
```typescript
interface UserPreferences {
  // 表示設定
  display: {
    theme: 'light' | 'dark';     // テーマ
    language: 'ja' | 'en';       // 言語
    units: {
      area: 'sqm' | 'tsubo' | 'tan' | 'ha'; // 面積単位
    };
  };
  
  // デフォルト表示
  defaults: {
    mapCenter?: [number, number]; // デフォルト中心座標
    mapZoom?: number;             // デフォルトズーム
    filters?: SearchCriteria['filters']; // デフォルトフィルタ
  };
  
  // 最近の検索
  recentSearches?: {
    query: string;
    timestamp: Date;
  }[];
  
  // お気に入り
  favorites?: {
    farmlandIds: string[];
    farmerIds: string[];
  };
}
```

## 🔄 データ同期モデル

### SyncStatus (同期状態)
```typescript
interface SyncStatus {
  lastSyncTime?: Date;            // 最終同期日時
  status: 'synced' | 'syncing' | 'pending' | 'error';
  pendingChanges: number;         // 未同期変更数
  errors?: {
    message: string;
    timestamp: Date;
  }[];
}
```

## 📝 サンプルデータ

### 農地データサンプル
```json
{
  "id": "farmland-001",
  "code": "FK-MY-2024-001",
  "geometry": {
    "type": "Polygon",
    "coordinates": [[
      [130.4544, 33.1525],
      [130.4548, 33.1525],
      [130.4548, 33.1528],
      [130.4544, 33.1528],
      [130.4544, 33.1525]
    ]]
  },
  "center": {
    "lat": 33.15265,
    "lng": 130.4546
  },
  "properties": {
    "location": {
      "prefecture": "福岡県",
      "city": "みやま市",
      "district": "瀬高町",
      "address": "瀬高町大字文廣1234",
      "lotNumber": "1234-1"
    },
    "landInfo": {
      "area": 3000,
      "landType": "田",
      "waterAccess": true,
      "sunlightCondition": "good"
    },
    "farmer": {
      "id": "farmer-001",
      "name": "山田太郎"
    },
    "crops": [{
      "id": "crop-001",
      "name": "コシヒカリ",
      "category": "穀物",
      "cultivation": {
        "area": 3000,
        "plantingDate": "2024-05-01"
      },
      "status": "growing"
    }],
    "management": {
      "status": "active"
    }
  }
}
```