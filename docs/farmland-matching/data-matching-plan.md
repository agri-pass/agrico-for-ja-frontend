# データマッチング計画書

## 📊 データソース

### 1. 集落営農法人所有農地データ (CSV)
- **ファイル**: `data/ex_owned_farmland.csv`
- **形式**: 
  ```
  大字○○ 小字 地番
  例: 大字宮崎 亀ノ面 583
  ```
- **件数**: 約200件

### 2. 農地GeoJSONデータ
- **形式**: GeoJSON Feature
- **Address形式**:
  ```
  福岡県みやま市高田町下楠田字於以2374
  ```
- **Tiban（地番）**: 別フィールドで提供

## 🔗 マッチング方法

### アプローチ1: 地番ベースマッチング
CSVの地番とGeoJSONのTibanフィールドを照合

**メリット**:
- シンプルな実装
- 高速な処理

**デメリット**:
- 地番の重複可能性
- 大字・小字の確認が必要

### アプローチ2: 住所文字列の部分一致
GeoJSONのAddressフィールドから大字・小字・地番を抽出して照合

**メリット**:
- より正確なマッチング
- 大字・小字も含めた照合

**デメリット**:
- 文字列処理が複雑
- 表記ゆれへの対応が必要

## 🎯 実装方針

### Phase 1: データ準備
1. CSVデータの読み込みと構造化
2. GeoJSONデータの住所フィールド解析
3. マッチングルールの定義

### Phase 2: マッチング処理
```typescript
interface MatchingRule {
  // CSVから抽出
  oaza: string;      // 大字（例：大字宮崎）
  koaza: string;     // 小字（例：亀ノ面）
  chiban: string;    // 地番（例：583）
  
  // GeoJSONから抽出
  address: string;   // フル住所
  tiban: string;     // 地番フィールド
}

// マッチング関数
function matchFarmland(csvData: CSVRecord, geoJsonFeature: Feature): boolean {
  // 1. 地番の一致確認
  if (csvData.chiban !== geoJsonFeature.properties.Tiban) {
    return false;
  }
  
  // 2. 住所に大字・小字が含まれているか確認
  const address = geoJsonFeature.properties.Address;
  const oazaMatch = address.includes(csvData.oaza.replace('大字', ''));
  const koazaMatch = address.includes(csvData.koaza);
  
  return oazaMatch && koazaMatch;
}
```

### Phase 3: 可視化
- マッチした農地: 特別な色（例：赤色）でピン表示
- マッチしなかった農地: 通常の色で表示
- 凡例に「集落営農法人所有地」を追加

## 📝 データ変換例

### CSV データ
```
大字宮崎 亀ノ面 583
```

### 期待されるGeoJSON Address
```
福岡県みやま市○○町宮崎字亀ノ面583
```

### マッチングロジック
1. CSVから抽出:
   - 大字: `宮崎`（「大字」を除去）
   - 小字: `亀ノ面`
   - 地番: `583`

2. GeoJSON Addressから確認:
   - `宮崎`が含まれるか
   - `亀ノ面`が含まれるか
   - Tiban === `583`

## 🚧 課題と対策

### 1. 表記ゆれ
- **課題**: 「ノ」と「の」、「ケ」と「ヶ」など
- **対策**: 正規化処理を実装

### 2. 地番の枝番
- **課題**: `583-1` vs `583`
- **対策**: 枝番を含めた完全一致と基本番号での部分一致の両方を試行

### 3. 大字の省略
- **課題**: GeoJSONで「大字」が省略されている可能性
- **対策**: 「大字」ありなし両方でマッチング

## 🔄 実装ステップ

1. **データ読み込み機能**
   - CSVパーサーの実装
   - データ構造への変換

2. **マッチング機能**
   - 住所正規化関数
   - マッチングアルゴリズム
   - マッチング結果の保存

3. **UI表示**
   - マッチした農地の特別表示
   - マッチング統計の表示
   - フィルタリング機能

## 📊 期待される結果

- マッチング率: 70-80%（表記ゆれを考慮）
- 視覚的な識別: 集落営農法人所有地が一目で分かる
- 統計情報: 所有農地の総面積、分布など