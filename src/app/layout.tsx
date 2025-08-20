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
          {/* メインコンテンツ */}
          <main id="main-content" role="main">
            {children}
          </main>
          
          {/* フッター要素 */}
          <footer role="contentinfo" className="site-footer">
            <div className="footer-container">
              <nav aria-label="フッターナビゲーション">
                <ul className="footer-links">
                  <li><a href="/privacy">プライバシーポリシー</a></li>
                  <li><a href="/terms">利用規約</a></li>
                  <li><a href="/contact">お問い合わせ</a></li>
                </ul>
              </nav>
              <p>&copy; 2025 会員制掲示板. All rights reserved.</p>
            </div>
          </footer>
        </Providers>
      </body>
    </html>
  );
}