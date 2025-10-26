/** @type {import('next').NextConfig} */
const nextConfig = {
  // 本番ビルドの最適化
  swcMinify: true,

  // 静的ファイルの最適化
  compress: true,

  // 画像の最適化設定
  images: {
    domains: [
      'server.arcgisonline.com',
      'cdnjs.cloudflare.com',
    ],
    unoptimized: false,
  },

  // 厳密モードを有効化
  reactStrictMode: true,

  // 本番環境でのソースマップを無効化（軽量化）
  productionBrowserSourceMaps: false,
};

export default nextConfig;
