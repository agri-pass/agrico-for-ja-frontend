# 農地管理システム

みやま市の農地管理システムのフロントエンドアプリケーション。集落営農法人が所有する農地をLeaflet地図上に可視化し、統計情報を表示します。

## 機能

- **ファイルアップロード**: GeoJSON（農地ピン・ポリゴン）とCSV（耕作者データ）をアップロード
- **地図表示**: Leafletを使用した航空写真地図
- **マーカークラスタリング**: 大量のピン（24MB+）を高速表示
- **組織別色分け**: 集落営農法人ごとに色分けして表示
- **統計情報**: 農地数、面積、マッチング率などを表示
- **ポリゴン表示**: ズームレベルに応じてポリゴンを表示/非表示

## 技術スタック

- Next.js 14 (App Router)
- TypeScript
- Leaflet 1.9.4 + Marker Cluster
- Ant Design
- Tailwind CSS
- Turf.js（地理空間計算）

## セットアップ

### 依存関係のインストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

開発サーバーは `http://localhost:8000` で起動します。

### ビルド

```bash
npm run build
```

### 本番サーバーの起動

```bash
npm start
```

## Vercelへのデプロイ

### 前提条件

- [Vercelアカウント](https://vercel.com/signup)
- Git リポジトリ（GitHub, GitLab, Bitbucket）

### 方法1: GitHub連携（推奨）

1. **GitHubにプッシュ**

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Vercelにログイン**
   - https://vercel.com にアクセス
   - GitHubアカウントでログイン

3. **プロジェクトをインポート**
   - 「Add New...」→「Project」をクリック
   - GitHubリポジトリを選択
   - 「Import」をクリック

4. **プロジェクト設定**
   - **Framework Preset**: Next.js（自動検出）
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`
   - **Install Command**: `npm install`

   ※ すべて自動設定されるため、変更不要です

5. **デプロイ**
   - 「Deploy」をクリック
   - ビルド完了まで1-3分待つ
   - 完了すると自動的にURLが発行されます

### 方法2: Vercel CLI

1. **Vercel CLIのインストール**

```bash
npm install -g vercel
```

2. **ログイン**

```bash
vercel login
```

3. **デプロイ**

```bash
# プレビュー環境にデプロイ
vercel

# 本番環境にデプロイ
vercel --prod
```

### 自動デプロイ

GitHub連携している場合、以下のブランチにpushすると自動デプロイされます：

- `main` ブランチ → 本番環境
- その他のブランチ → プレビュー環境（PR毎に一意のURL）

## セキュリティ

このアプリケーションは**完全にクライアントサイド**で動作します：

✅ **安全な点**
- アップロードされたファイルはブラウザのメモリ内でのみ処理
- サーバーにファイルは送信されません
- 他のユーザーがデータを見ることはできません
- ページリロードでデータは消去されます

🔒 **セキュリティヘッダー**（`vercel.json`で設定済み）
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`

## 使用方法

### 1. ファイルのアップロード

アプリケーションにアクセスすると、ファイルアップロード画面が表示されます。

以下の3つのファイルを選択：

1. **農地ピン（GeoJSON）**: 農地の位置情報
2. **ポリゴン（GeoJSON）**: 農地の境界情報
3. **耕作者データ（CSV）**: 集落営農法人の所有情報

「データを読み込む」ボタンをクリック

### 2. 地図の操作

- **ズーム**: マウスホイール or ズームボタン
- **パン**: ドラッグして移動
- **マーカークリック**: 農地詳細を表示
- **クラスタクリック**: ズームイン

### 3. 表示切り替え

地図左側のチェックボックス：

- ✅ ピン表示
- ✅ ポリゴン表示
- ✅ 未マッチポリゴン表示

### 4. 統計情報

画面右上に表示：

- 総農地数
- 集落営農法人数
- 組織別の件数と割合
- マッチング率

## トラブルシューティング

### ビルドエラー

```bash
# キャッシュクリア
rm -rf node_modules .next
npm install
npm run build
```

### 地図が表示されない

1. ブラウザの開発者ツール（F12）でエラー確認
2. ファイル形式を確認（GeoJSON, CSV）
3. ファイルサイズを確認（推奨: 50MB以下）

### Vercelデプロイエラー

1. ビルドログを確認
2. ローカルで `npm run build` が成功するか確認
3. `vercel.json` の設定を確認

## プロジェクト構造

```
src/
├── app/                    # Next.js App Router
│   ├── page.tsx           # トップページ（地図表示）
│   ├── add-pin/           # ピン追加ページ
│   └── debug/             # マッチングデバッグ
├── features/              # 機能別モジュール
│   └── farmland-map/      # 農地地図機能
│       ├── components/    # Reactコンポーネント
│       ├── services/      # データサービス層
│       ├── lib/          # ビジネスロジック
│       └── types/        # TypeScript型定義
└── shared/               # 共有コード
```

## ライセンス

Private

## サポート

問題がある場合は、GitHubのIssuesで報告してください。
