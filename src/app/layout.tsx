import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "オープン掲示板",
  description: "誰でも自由に投稿できる掲示板",
  keywords: "掲示板,オープン,コミュニティ",
  openGraph: {
    title: "オープン掲示板",
    description: "誰でも自由に投稿できる掲示板",
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
      <body
        className="antialiased"
        style={{ margin: 0, padding: 0, width: '100%', minHeight: '100vh' }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
