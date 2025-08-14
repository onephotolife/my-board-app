/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  
  // セキュリティ強化設定
  poweredByHeader: false, // X-Powered-Byヘッダーを無効化
  compress: true,         // gzip圧縮有効化
  
  // 本番環境設定
  productionBrowserSourceMaps: false, // 本番環境でソースマップを無効化
  
  // Turbopackの最適化設定
  experimental: {
    // MUIとの互換性向上
    optimizePackageImports: ['@mui/material', '@mui/icons-material'],
  },
  
  // セキュリティヘッダー設定
  async headers() {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    return [
      {
        // すべてのルートに適用
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on'
          },
          ...(isDevelopment ? [] : [
            {
              key: 'Strict-Transport-Security',
              value: 'max-age=63072000; includeSubDomains; preload'
            }
          ]),
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()'
          }
        ]
      },
      {
        // APIルートに追加のセキュリティヘッダー
        source: '/api/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-store, max-age=0, must-revalidate'
          }
        ]
      }
    ];
  },
  
  // Webpackの設定（Turbopackが使用されない場合のフォールバック）
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // クライアントサイドのモジュール解決を最適化
      config.resolve.alias = {
        ...config.resolve.alias,
        '@mui/material': '@mui/material/esm',
      };
      
      // セキュリティ関連の設定
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
  
  // HMRの最適化
  onDemandEntries: {
    maxInactiveAge: 25 * 1000,
    pagesBufferLength: 2,
  },
  
  // 環境変数の公開設定
  env: {
    NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || '会員制掲示板',
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  },
};

// 環境変数の検証（ビルド時）
if (process.env.NODE_ENV === 'production') {
  const requiredEnvVars = [
    'NEXTAUTH_URL',
    'NEXTAUTH_SECRET',
    'MONGODB_URI',
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (envVar) => !process.env[envVar]
  );

  if (missingEnvVars.length > 0) {
    console.warn('⚠️  必須の環境変数が設定されていません:');
    missingEnvVars.forEach((envVar) => {
      console.warn(`   - ${envVar}`);
    });
    console.warn('\n本番環境では必ず設定してください。');
  }
}

module.exports = nextConfig;