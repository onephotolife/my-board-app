import type { Metadata } from 'next';

import './globals.css';
import { AppReadyNotifier } from '@/components/AppReadyNotifier';
import { NoScriptFallback } from '@/components/NoScriptFallback';
import { PerformanceTracker } from '@/components/PerformanceTracker';

import { Providers } from './providers';

export const metadata: Metadata = {
  title: {
    default: '会員制掲示板',
    template: '%s | 会員制掲示板',
  },
  description: '会員限定の掲示板システム。安全で快適なコミュニティ空間を提供します。',
  keywords: '掲示板,会員制,コミュニティ,フォーラム,投稿,メッセージ,コミュニケーション',
  authors: [{ name: '会員制掲示板運営チーム' }],
  creator: '会員制掲示板',
  publisher: '会員制掲示板',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    title: '会員制掲示板',
    description: '会員限定の掲示板システム。安全で快適なコミュニティ空間を提供します。',
    type: 'website',
    locale: 'ja_JP',
    siteName: '会員制掲示板',
  },
  twitter: {
    card: 'summary',
    title: '会員制掲示板',
    description: '会員限定の掲示板システム',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <head>
        {/* パフォーマンス最適化 */}
        <link rel="dns-prefetch" href="//fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />

        {/* Progressive Web App */}
        <meta name="theme-color" content="#667eea" />
        <meta name="application-name" content="会員制掲示板" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="掲示板" />

        {/* セキュリティ強化 - X-Frame-OptionsはHTTPヘッダーで設定済み（vercel.json） */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
      </head>
      <body>
        {/* JavaScript無効時のフォールバック */}
        <NoScriptFallback />

        <Providers>
          {/* グローバルヘッダーは仕様変更により削除（全ページ共通ヘッダー非表示） */}
          {/* メインコンテンツ */}
          <main id="main-content" role="main">
            {children}
          </main>

          {/* フッター要素 */}
          <footer role="contentinfo" className="site-footer">
            <div className="footer-container">
              <nav aria-label="フッターナビゲーション">
                <ul className="footer-links">
                  <li>
                    <a href="/privacy">プライバシーポリシー</a>
                  </li>
                  <li>
                    <a href="/terms">利用規約</a>
                  </li>
                </ul>
              </nav>
              <p>&copy; 2025 会員制掲示板. All rights reserved.</p>
            </div>
          </footer>

          {/* アプリケーション読み込み完了通知 */}
          <AppReadyNotifier />

          {/* パフォーマンス監視（Hydration Mismatch回避版） */}
          <PerformanceTracker />
        </Providers>
      </body>
    </html>
  );
}
