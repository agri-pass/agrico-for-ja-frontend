# 農地管理システム 技術アーキテクチャ仕様書

## 🏗 システムアーキテクチャ

### 全体構成
```
┌─────────────────────────────────────────────┐
│           ブラウザ (Client)                   │
│  ┌─────────────────────────────────────┐    │
│  │     Next.js App (React)              │    │
│  │  ┌──────────┐  ┌──────────────┐    │    │
│  │  │   Map     │  │  UI Components│    │    │
│  │  │ (Leaflet) │  │  (Tailwind)   │    │    │
│  │  └──────────┘  └──────────────┘    │    │
│  │         State Management             │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
                      ↓
         Next.js API Routes / Static Data
                      ↓
              External Services
         (OpenStreetMap Tile Server)
```

## 📁 プロジェクト構造

```
agrico-for-ja-frontend/
├── docs/                      # ドキュメント
│   ├── requirements.md       # 要件定義
│   ├── architecture.md       # アーキテクチャ仕様
│   ├── data-models.md        # データモデル定義
│   └── development-guide.md  # 開発ガイド
│
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── layout.tsx        # ルートレイアウト
│   │   ├── page.tsx          # ホームページ（地図画面）
│   │   ├── globals.css       # グローバルスタイル
│   │   └── api/              # API Routes
│   │       └── farmlands/    # 農地データAPI
│   │
│   ├── components/           # UIコンポーネント
│   │   ├── Map/             # 地図関連コンポーネント
│   │   │   ├── MapContainer.tsx
│   │   │   ├── FarmlandPolygon.tsx
│   │   │   ├── FarmlandPin.tsx
│   │   │   ├── MapControls.tsx
│   │   │   └── MapPopup.tsx
│   │   │
│   │   ├── UI/              # 共通UIコンポーネント
│   │   │   ├── Header.tsx
│   │   │   ├── SearchBar.tsx
│   │   │   ├── FilterPanel.tsx
│   │   │   ├── Legend.tsx
│   │   │   ├── SidePanel.tsx
│   │   │   └── StatsCard.tsx
│   │   │
│   │   └── Dashboard/       # ダッシュボード
│   │       ├── StatsDashboard.tsx
│   │       ├── ChartArea.tsx
│   │       └── ChartFarmer.tsx
│   │
│   ├── hooks/               # カスタムフック
│   │   ├── useMap.ts       # 地図操作用フック
│   │   ├── useFarmlands.ts # 農地データ用フック
│   │   ├── useFilter.ts    # フィルタリング用フック
│   │   └── useSearch.ts    # 検索用フック
│   │
│   ├── lib/                # ユーティリティ
│   │   ├── mapUtils.ts     # 地図関連ユーティリティ
│   │   ├── dataUtils.ts    # データ処理ユーティリティ
│   │   ├── colorUtils.ts   # 色管理ユーティリティ
│   │   └── constants.ts    # 定数定義
│   │
│   ├── types/              # TypeScript型定義
│   │   ├── farmland.ts     # 農地関連の型
│   │   ├── map.ts          # 地図関連の型
│   │   └── index.ts        # 型エクスポート
│   │
│   ├── data/               # 静的データ/モックデータ
│   │   ├── mockFarmlands.json
│   │   └── farmers.json
│   │
│   └── contexts/           # Reactコンテキスト
│       ├── MapContext.tsx  # 地図状態管理
│       └── FilterContext.tsx # フィルタ状態管理
│
├── public/                 # 静的ファイル
│   ├── icons/             # アイコン
│   └── images/            # 画像
│
├── tests/                 # テストファイル
│   ├── unit/             # ユニットテスト
│   └── e2e/              # E2Eテスト
│
└── config/               # 設定ファイル
    └── map.config.ts     # 地図設定
```

## 🔧 技術スタック詳細

### コア技術
| 技術 | バージョン | 用途 |
|------|----------|------|
| Next.js | 14.x | フレームワーク |
| React | 18.x | UIライブラリ |
| TypeScript | 5.x | 型安全性 |
| Tailwind CSS | 3.x | スタイリング |

### 地図関連
| 技術 | バージョン | 用途 |
|------|----------|------|
| Leaflet | 1.9.x | 地図エンジン |
| React-Leaflet | 4.2.x | React統合 |
| @types/leaflet | 1.9.x | 型定義 |

### 開発ツール
| 技術 | 用途 |
|------|------|
| ESLint | コード品質 |
| Prettier | コードフォーマット |
| Jest | ユニットテスト |
| Playwright | E2Eテスト |

## 🎨 コンポーネント設計

### 主要コンポーネント

#### MapContainer
```typescript
interface MapContainerProps {
  center?: [number, number];  // 中心座標
  zoom?: number;              // ズームレベル
  farmlands: Farmland[];      // 農地データ
  onFarmlandClick?: (id: string) => void;
}
```
- 地図の初期化と管理
- Leafletインスタンスの制御
- イベントハンドリング

#### FarmlandPolygon
```typescript
interface FarmlandPolygonProps {
  farmland: Farmland;
  color: string;
  opacity?: number;
  onClick?: () => void;
}
```
- ポリゴンの描画
- 耕作者別の色付け
- クリックイベント処理

#### FilterPanel
```typescript
interface FilterPanelProps {
  farmers: Farmer[];
  landTypes: LandType[];
  onFilterChange: (filters: FilterOptions) => void;
}
```
- フィルタUI表示
- フィルタ状態管理
- フィルタ適用通知

## 📊 状態管理

### グローバル状態
```typescript
// MapContext
interface MapState {
  center: [number, number];
  zoom: number;
  bounds: LatLngBounds;
  selectedFarmland: string | null;
}

// FilterContext  
interface FilterState {
  farmers: string[];
  landTypes: LandType[];
  areaRange: [number, number];
  searchText: string;
}
```

### ローカル状態
- コンポーネント固有の状態はuseStateで管理
- フォーム状態は各コンポーネント内で管理

## 🚀 パフォーマンス最適化

### 地図表示の最適化
1. **ビューポートベースレンダリング**
   - 表示範囲内のポリゴンのみレンダリング
   - React.memoによるコンポーネント最適化

2. **データクラスタリング**
   - ズームレベルに応じたデータ集約
   - マーカークラスタリングの実装

3. **遅延ロード**
   - 地図コンポーネントの動的インポート
   - Next.js Dynamic Importの活用

### データ処理の最適化
1. **キャッシュ戦略**
   - 農地データのメモリキャッシュ
   - フィルタ結果のキャッシュ

2. **仮想スクロール**
   - リスト表示での仮想化
   - React Windowの活用（必要時）

## 🔌 API設計

### エンドポイント
```
GET /api/farmlands
  - クエリパラメータ: bounds, farmer, landType, area
  - レスポンス: Farmland[]

GET /api/farmlands/[id]
  - レスポンス: Farmland

GET /api/farmers
  - レスポンス: Farmer[]

GET /api/stats
  - レスポンス: Statistics
```

### データフロー
```
User Action
    ↓
React Component
    ↓
Custom Hook (useFarmlands)
    ↓
API Route / Static Data
    ↓
Data Processing
    ↓
State Update
    ↓
UI Re-render
```

## 🛡 セキュリティ考慮事項

### フロントエンド
- XSS対策: Reactのデフォルトエスケープ機能
- CSP (Content Security Policy)の設定
- 環境変数の適切な管理

### API
- レート制限の実装
- CORS設定
- 入力値検証

## 📱 レスポンシブ設計

### ブレークポイント
```css
- Mobile: < 640px
- Tablet: 640px - 1024px  
- Desktop: > 1024px
```

### モバイル最適化
- タッチジェスチャー対応
- モバイル向けUIコンポーネント
- 軽量な地図タイルの使用

## 🧪 テスト戦略

### ユニットテスト
- ユーティリティ関数
- カスタムフック
- データ処理ロジック

### 統合テスト
- コンポーネント間の連携
- API通信
- 状態管理

### E2Eテスト
- ユーザーシナリオ
- クリティカルパス
- パフォーマンステスト

## 📈 監視とログ

### エラー監視
- クライアントエラーの収集
- APIエラーのトラッキング

### パフォーマンス監視
- Core Web Vitals
- 地図レンダリング時間
- データ取得時間

## 🔄 デプロイメント

### ビルド設定
```javascript
// next.config.js
module.exports = {
  output: 'standalone',
  images: {
    domains: ['tile.openstreetmap.org'],
  },
  env: {
    MAP_DEFAULT_CENTER: process.env.MAP_DEFAULT_CENTER,
  },
}
```

### 環境変数
```env
NEXT_PUBLIC_MAP_CENTER_LAT=33.1525
NEXT_PUBLIC_MAP_CENTER_LNG=130.4544
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=13
```