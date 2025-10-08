# 農地管理システム 開発ガイド

## 🚀 開発ロードマップ

### Phase 1: MVP実装（Week 1-2）
最小限の機能で動作するプロトタイプを構築

#### Sprint 1.1: 基盤構築
- [x] プロジェクトセットアップ
- [x] ドキュメント作成
- [ ] 基本ディレクトリ構造の作成
- [ ] TypeScript型定義の実装
- [ ] 基本コンポーネントの作成

#### Sprint 1.2: 地図機能実装
- [ ] Leaflet地図の表示
- [ ] みやま市を中心とした初期表示
- [ ] ズーム・パン機能
- [ ] サンプル農地データの作成

#### Sprint 1.3: ポリゴン表示
- [ ] 農地ポリゴンの表示
- [ ] 基本的なポップアップ表示
- [ ] 静的データの読み込み

### Phase 2: 基本機能実装（Week 3-4）
ユーザビリティを向上させる基本機能の追加

#### Sprint 2.1: 耕作者機能
- [ ] 耕作者別の色分け実装
- [ ] 凡例コンポーネントの作成
- [ ] 耕作者データの管理

#### Sprint 2.2: 検索・フィルタ
- [ ] 検索バーの実装
- [ ] 基本的なフィルタリング機能
- [ ] 検索結果のハイライト表示

#### Sprint 2.3: UI改善
- [ ] レスポンシブデザイン対応
- [ ] サイドパネルの実装
- [ ] ヘッダー・フッターの整備

### Phase 3: 拡張機能実装（Week 5-6）
データ分析と可視化機能の追加

#### Sprint 3.1: 統計機能
- [ ] 統計ダッシュボードの実装
- [ ] グラフコンポーネントの追加
- [ ] データ集計ロジックの実装

#### Sprint 3.2: 高度なフィルタ
- [ ] 複数条件フィルタ
- [ ] 面積範囲フィルタ
- [ ] 作物別フィルタ

#### Sprint 3.3: パフォーマンス最適化
- [ ] ビューポートベースレンダリング
- [ ] データキャッシング
- [ ] 遅延ローディング

## 🛠 開発環境セットアップ

### 1. リポジトリのクローン
```bash
git clone [repository-url]
cd agrico-for-ja-frontend
```

### 2. 依存関係のインストール
```bash
npm install
```

### 3. 環境変数の設定
`.env.local`ファイルを作成：
```env
# 地図設定
NEXT_PUBLIC_MAP_CENTER_LAT=33.1525
NEXT_PUBLIC_MAP_CENTER_LNG=130.4544
NEXT_PUBLIC_MAP_DEFAULT_ZOOM=13

# API設定（将来使用）
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. 開発サーバーの起動
```bash
npm run dev
# http://localhost:6000 でアクセス
```

## 📝 コーディング規約

### TypeScript
```typescript
// ✅ 良い例
interface Props {
  farmland: Farmland;
  onClick?: (id: string) => void;
}

// ❌ 悪い例
interface Props {
  farmland: any;
  onClick?: Function;
}
```

### React コンポーネント
```typescript
// ✅ 関数コンポーネント + TypeScript
export const FarmlandCard: React.FC<Props> = ({ farmland, onClick }) => {
  // ロジック
  return <div>...</div>;
};

// ✅ カスタムフックの使用
const { data, loading, error } = useFarmlands();
```

### ファイル命名規則
```
components/
  FarmlandCard.tsx       # PascalCase for components
  useFarmlands.ts        # camelCase for hooks
  mapUtils.ts            # camelCase for utilities
  constants.ts           # lowercase for constants
```

### CSS/Tailwind
```tsx
// ✅ Tailwind クラスの使用
<div className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow">

// ✅ 条件付きクラス
<div className={cn(
  "base-class",
  isActive && "active-class",
  isDisabled && "disabled-class"
)}>
```

## 🧪 テスト実装

### ユニットテスト
```typescript
// utils/mapUtils.test.ts
describe('mapUtils', () => {
  describe('calculateArea', () => {
    it('should calculate polygon area correctly', () => {
      const polygon = [[...]];
      const area = calculateArea(polygon);
      expect(area).toBe(3000);
    });
  });
});
```

### コンポーネントテスト
```typescript
// components/FarmlandCard.test.tsx
describe('FarmlandCard', () => {
  it('should render farmland information', () => {
    const farmland = mockFarmland();
    render(<FarmlandCard farmland={farmland} />);
    expect(screen.getByText(farmland.properties.farmer.name)).toBeInTheDocument();
  });
});
```

## 🎨 UIコンポーネント実装例

### 農地カードコンポーネント
```typescript
// components/UI/FarmlandCard.tsx
import React from 'react';
import { Farmland } from '@/types';

interface FarmlandCardProps {
  farmland: Farmland;
  onSelect?: (id: string) => void;
}

export const FarmlandCard: React.FC<FarmlandCardProps> = ({
  farmland,
  onSelect
}) => {
  const { properties } = farmland;
  const area = (properties.landInfo.area / 10000).toFixed(2); // ㎡ to ha
  
  return (
    <div 
      className="p-4 bg-white rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer"
      onClick={() => onSelect?.(farmland.id)}
    >
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">
          {properties.location.lotNumber}
        </h3>
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
          {properties.landInfo.landType}
        </span>
      </div>
      
      <p className="text-gray-600 text-sm mb-1">
        {properties.location.address}
      </p>
      
      <div className="flex justify-between items-center mt-3">
        <span className="text-sm text-gray-500">
          耕作者: {properties.farmer.name}
        </span>
        <span className="font-medium">
          {area} ha
        </span>
      </div>
    </div>
  );
};
```

### カスタムフック実装例
```typescript
// hooks/useFarmlands.ts
import { useState, useEffect, useMemo } from 'react';
import { Farmland, SearchCriteria } from '@/types';
import { fetchFarmlands } from '@/lib/api';

export const useFarmlands = (criteria?: SearchCriteria) => {
  const [farmlands, setFarmlands] = useState<Farmland[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    const loadFarmlands = async () => {
      try {
        setLoading(true);
        const data = await fetchFarmlands(criteria);
        setFarmlands(data);
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };
    
    loadFarmlands();
  }, [criteria]);
  
  const stats = useMemo(() => {
    return {
      total: farmlands.length,
      totalArea: farmlands.reduce((sum, f) => 
        sum + f.properties.landInfo.area, 0
      ),
      farmers: new Set(farmlands.map(f => 
        f.properties.farmer.id
      )).size
    };
  }, [farmlands]);
  
  return { farmlands, loading, error, stats };
};
```

## 🗺 地図実装のポイント

### Leaflet動的インポート
```typescript
// components/Map/MapContainer.tsx
import dynamic from 'next/dynamic';

const DynamicMap = dynamic(
  () => import('./LeafletMap'),
  { 
    ssr: false,
    loading: () => <div>地図を読み込み中...</div>
  }
);
```

### ポリゴン描画の最適化
```typescript
// 表示範囲内のポリゴンのみレンダリング
const visibleFarmlands = useMemo(() => {
  if (!map) return farmlands;
  
  const bounds = map.getBounds();
  return farmlands.filter(farmland => {
    const { bbox } = farmland;
    return bounds.intersects([
      [bbox.minLat, bbox.minLng],
      [bbox.maxLat, bbox.maxLng]
    ]);
  });
}, [farmlands, mapBounds]);
```

## 📊 パフォーマンス最適化

### React.memoの活用
```typescript
export const FarmlandPolygon = React.memo(({ 
  farmland, 
  color, 
  onClick 
}: Props) => {
  // コンポーネント実装
}, (prevProps, nextProps) => {
  // カスタム比較ロジック
  return prevProps.farmland.id === nextProps.farmland.id &&
         prevProps.color === nextProps.color;
});
```

### useMemoとuseCallbackの使用
```typescript
const filteredFarmlands = useMemo(() => 
  farmlands.filter(f => /* フィルタ条件 */),
  [farmlands, filters]
);

const handleFarmlandClick = useCallback((id: string) => {
  // クリック処理
}, []);
```

## 🐛 デバッグとトラブルシューティング

### よくある問題と解決方法

#### 1. Leafletの動的インポートエラー
```typescript
// 問題: window is not defined
// 解決: dynamic importでSSRを無効化
const Map = dynamic(() => import('./Map'), { ssr: false });
```

#### 2. ポリゴンが表示されない
```typescript
// 問題: 座標の順序が間違っている
// 解決: [経度, 緯度]の順序を確認
coordinates: [[lng, lat], [lng, lat], ...]  // ✅ 正しい
coordinates: [[lat, lng], [lat, lng], ...]  // ❌ 間違い
```

#### 3. パフォーマンス問題
```typescript
// 問題: 大量のポリゴンで遅い
// 解決: ビューポートベースのレンダリング
const visibleItems = items.filter(isInViewport);
```

## 📦 ビルドとデプロイ

### プロダクションビルド
```bash
# ビルド
npm run build

# ビルド結果の確認
npm run start
```

### ビルドの最適化
```javascript
// next.config.js
module.exports = {
  images: {
    domains: ['tile.openstreetmap.org'],
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
};
```

## 🔗 参考リソース

### ドキュメント
- [Next.js Documentation](https://nextjs.org/docs)
- [Leaflet Documentation](https://leafletjs.com/reference.html)
- [React-Leaflet Documentation](https://react-leaflet.js.org/)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)

### ツール
- [GeoJSON.io](https://geojson.io/) - GeoJSONデータの作成・編集
- [Mapbox Studio](https://studio.mapbox.com/) - カスタム地図スタイル
- [Color Hunt](https://colorhunt.co/) - カラーパレット選択

## 🤝 コントリビューション

### ブランチ戦略
```
main            # 本番環境
├── develop     # 開発環境
    ├── feature/map-display    # 機能開発
    ├── feature/search        # 機能開発
    └── fix/polygon-render    # バグ修正
```

### コミットメッセージ
```
feat: 農地ポリゴンの表示機能を追加
fix: ポリゴンクリック時のエラーを修正
docs: READMEを更新
style: コードフォーマットを統一
refactor: 地図コンポーネントをリファクタリング
test: 農地カードのテストを追加
chore: 依存関係を更新
```

### プルリクエスト
1. featureブランチを作成
2. 変更を実装
3. テストを追加/更新
4. developブランチへPR作成
5. コードレビュー
6. マージ