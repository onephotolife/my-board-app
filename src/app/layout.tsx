import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import ClientHeader from "@/components/ClientHeader";

export const metadata: Metadata = {
  title: "会員制掲示板",
  description: "会員限定の掲示板システム",
  keywords: "掲示板,会員制,コミュニティ",
  openGraph: {
    title: "会員制掲示板",
    description: "会員限定の掲示板システム",
    type: "website",
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
      <body>
        <Providers>
          {/* スキップリンク（アクセシビリティ向上） */}
          <a href="#main-content" className="skip-link">
            メインコンテンツへスキップ
          </a>
          
          {/* ナビゲーション要素 */}
          <nav role="navigation" aria-label="メインナビゲーション" className="main-nav">
            <div className="nav-container">
              <a href="/" className="nav-logo">会員制掲示板</a>
              <ul className="nav-menu">
                <li><a href="/">ホーム</a></li>
                <li><a href="/board">掲示板</a></li>
                <li><a href="/auth/signin">ログイン</a></li>
              </ul>
            </div>
          </nav>
          
          {/* メインコンテンツ */}
          <main id="main-content" role="main">
            {children}
          </main>
          
          {/* フッター要素 */}
          <footer role="contentinfo" className="site-footer">
            <div className="footer-container">
              <p>&copy; 2025 会員制掲示板. All rights reserved.</p>
              <nav aria-label="フッターナビゲーション">
                <ul className="footer-links">
                  <li><a href="/privacy">プライバシーポリシー</a></li>
                  <li><a href="/terms">利用規約</a></li>
                  <li><a href="/contact">お問い合わせ</a></li>
                </ul>
              </nav>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}