/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // Turbopackの最適化設定
  experimental: {
    // MUIとの互換性向上
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  
  // Webpackの設定（Turbopackが使用されない場合のフォールバック）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドのモジュール解決を最適化
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mui/material': '@mui/material/esm',
      };
    }
    return config;
  },
  
  // HMRの最適化
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
};

module.exports = nextConfig;