import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  
  // 画像最適化
  images: {
    formats: ['image/avif', 'image/webp'],
  },

  // Material-UIの最適化
  modularizeImports: {
    '@mui/material': {
      transform: '@mui/material/{{member}}',
    },
    '@mui/icons-material': {
      transform: '@mui/icons-material/{{member}}',
    },
  },

  // Webpack設定の最適化
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドのバンドル最適化
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          cacheGroups: {
            mui: {
              test: /[\\/]node_modules[\\/]@mui[\\/]/,
              name: 'mui',
              priority: 10,
            },
          },
        },
      };
    }
    return config;
  },

};

export default nextConfig;
