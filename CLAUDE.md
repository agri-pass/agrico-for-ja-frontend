# CLAUDE.md

このファイルは、Claude Code (claude.ai/code) がこのリポジトリのコードを扱う際のガイダンスを提供します。

## リポジトリ概要

みやま市の農地管理システムのフロントエンドアプリケーションです。集落営農法人が所有する農地をLeaflet地図上に可視化し、統計情報を表示します。

- **フレームワーク**: Next.js 14 (App Router)
- **マップライブラリ**: Leaflet 1.9.4
- **UIライブラリ**: Ant Design (antd) + Tailwind CSS
- **言語**: TypeScript
- **開発ポート**: 8000

## 開発コマンド

```bash
# 依存関係のインストール
npm install

# 開発サーバーの起動 (ポート8000)
npm run dev

# プロダクションビルド
npm run build

# プロダクションサーバーの起動
npm start

# Lintチェック
npm run lint
```

## アーキテクチャ概要

### ディレクトリ構造とコロケーションパターン

このプロジェクトは**コロケーションパターン**を採用しています。関連するファイル（コンポーネント、サービス、型定義、ビジネスロジック）を機能ごとに同じディレクトリにまとめることで、コードの可読性と保守性を向上させています。

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # トップページ（地図表示）
│   ├── debug/page.tsx     # マッチングデバッグページ
│   ├── layout.tsx         # ルートレイアウト
│   └── globals.css        # グローバルCSS
├── features/              # 機能別モジュール（コロケーションパターン）
│   └── farmland-map/      # 農地地図機能
│       ├── components/    # Reactコンポーネント
│       │   ├── Map.tsx
│       │   ├── MapContent.tsx
│       │   └── MatchingDebug.tsx
│       ├── services/      # データサービス層
│       │   └── dataService.ts
│       ├── lib/          # ビジネスロジック
│       │   ├── dataMatching.ts
│       │   └── matchingService.ts
│       ├── types/        # TypeScript型定義
│       │   ├── farmland.types.ts
│       │   └── statistics.types.ts
│       └── index.ts      # 機能のエントリーポイント
├── shared/               # 複数機能で共有されるコード
│   └── lib/utils.ts     # 共有ユーティリティ関数
└── lib/                 # グローバルライブラリ
```

### コロケーションパターンの利点

1. **関連コードの近接性**: 機能に関連するすべてのコード（UI、ロジック、型）が同じディレクトリ内にある
2. **インポートパスの簡潔性**: 相対パスが短く、依存関係が明確
3. **機能の独立性**: 各機能が独立したモジュールとして動作
4. **スケーラビリティ**: 新しい機能を追加する際は`features/`配下に新しいディレクトリを作成

### 新しい機能を追加する場合

```
features/
└── 新機能名/
    ├── components/     # その機能専用のコンポーネント
    ├── services/       # その機能専用のサービス
    ├── lib/           # その機能専用のビジネスロジック
    ├── types/         # その機能専用の型定義
    └── index.ts       # 外部に公開するAPIのエントリーポイント
```

**重要**: `shared/`ディレクトリは複数の機能で共有されるコードのみを配置してください。単一の機能でしか使わないコードは、その機能のディレクトリ内に配置すべきです。

### 主要コンポーネント

1. **Map.tsx** (`src/features/farmland-map/components/Map.tsx`)
   - データ読み込みとMapContentの動的インポート
   - SSRを無効化してLeafletをクライアントサイドでのみ実行
   - 統計情報とエラー処理を担当

2. **MapContent.tsx** (`src/features/farmland-map/components/MapContent.tsx`)
   - Leaflet地図の初期化と表示
   - 農地マーカーの配置
   - 統計情報カードの表示（Ant Design Card）
   - 農地詳細モーダル（Ant Design Modal）

3. **dataService.ts** (`src/features/farmland-map/services/dataService.ts`)
   - GeoJSONとCSVデータの読み込み
   - データマッチング処理
   - 統計情報の計算
   - シングルトンパターンで実装

### データフロー

1. GeoJSONファイル (`/public/data/pin.geojson`) - 農地の位置情報
2. CSVファイル (`/public/data/ex_owned_farmland.csv`) - 集落営農法人の所有情報
3. `dataService` がデータを読み込みマッチング
4. `Map` コンポーネントがデータを取得
5. `MapContent` が地図上に可視化

## 主要機能

### 1. 農地地図表示
- Esri World Imageryの航空写真タイル
- みやま市中心座標: `[33.1525, 130.4544]`
- ズームレベル: 13

### 2. 農地マーカー
- 組織別に色分け（8色のパレット）
- 集落営農法人: 各組織に割り当てられた色
- その他農地: ティール色 (#4ECDC4)
- ツールチップで基本情報を表示

### 3. 統計情報表示
- 画面右上にAnt Design Cardで表示
- ヘッダーの下に配置（`top: 96px`）
- 総農地数、集落営農法人数、その他農地数
- 組織別の件数と割合
- マッチング率

### 4. 農地詳細モーダル
- マーカークリックでモーダル表示
- シンプルな「ラベル：値」形式
- 表示項目:
  - 耕作者（組織名または「その他」）
  - 住所
  - 地番
  - 面積
  - 農地区分
  - 技術情報（開発用、折りたたみ）

## データマッチングロジック

`src/features/farmland-map/lib/matchingService.ts` で実装：

1. 住所解析（大字、小字、地番の抽出）
2. GeoJSONとCSVデータのマッチング
3. マッチングスコアの計算
4. ユニークなCSVマッチ数の計算

## スタイリング

- **Tailwind CSS**: ユーティリティファーストのスタイリング
- **Ant Design**: Cardコンポーネント、Modalコンポーネント
- **カスタムスタイル**: Leafletマーカー用のdivIcon

### スタイリングガイドライン

1. **基本はTailwind CSS**: ユーティリティクラスを優先的に使用
2. **Ant Designとの併用**: CardやModalなど複雑なUIコンポーネント
3. **インラインstyle**: 動的な値（色、位置）や外部ライブラリ（Leaflet）との統合時
4. **シンプルで読みやすいデザイン**: ラベルと値の区別を明確に

## 重要な注意事項

1. **Leafletの動的インポート**: SSRを避けるため`dynamic(() => import(), { ssr: false })`を使用
2. **地図の高さ**: `invalidateSize()`を呼び出してLeafletに高さを再計算させる（初期化後100ms後）
3. **型安全性**: `any`型を避け、適切な型定義を使用（`types/`ディレクトリに定義）
4. **データ読み込み**: GeoJSONとCSVを両方読み込んでからマッチング処理
5. **高さの伝播**: `fixed inset-0` → `flex-1 min-h-0` → `relative w-full h-full` → `absolute inset-0`の階層構造

## TypeScript型定義

主要な型は `src/features/farmland-map/types/` に定義：

- `farmland.types.ts`: GeoJSONのFeature型、Farmland関連の型
- `statistics.types.ts`: Statistics、OrganizationStatistics、FarmlandDetails型

**コロケーションの原則**: 機能固有の型は機能ディレクトリ内の`types/`に配置し、複数機能で共有する型のみグローバルな型定義ファイルに配置します。

## デバッグ

- デバッグページ: http://localhost:8000/debug
- マッチング結果の詳細確認が可能
- `MatchingDebug.tsx`コンポーネントを使用

## 開発時のポイント

1. **新しい機能を追加する場合**
   - `features/`配下に機能別ディレクトリを作成
   - コンポーネント、サービス、型を同じディレクトリにコロケーション
   - `index.ts`でエクスポートするAPIを明確に定義

2. **スタイル変更時**
   - Tailwind CSSのユーティリティクラスを優先
   - カスタムスタイルが必要な場合はインラインstyleプロパティ使用
   - Ant Designコンポーネントのスタイルは`style`プロパティで上書き

3. **データ構造変更時**
   - 型定義を先に更新（`types/`ディレクトリ）
   - dataServiceのマッチングロジックを確認
   - 統計計算ロジックへの影響を確認

4. **UI改善時**
   - Ant Designコンポーネントを活用
   - シンプルで読みやすいデザインを心がける
   - ラベルと値の区別を明確にする（例: `text-gray-600`でラベル、`text-gray-900 font-medium`で値）

## コード規約

1. **インポート順序**:
   - Reactライブラリ
   - 外部ライブラリ
   - 内部モジュール（機能内の相対パス）
   - 型定義

2. **命名規則**:
   - コンポーネント: PascalCase（例: `MapContent.tsx`）
   - サービス: camelCase（例: `dataService.ts`）
   - 型: PascalCase（例: `FarmlandFeature`）

3. **コメント**:
   - 日本語でわかりやすく
   - セクションの区切りにコメントを入れる
