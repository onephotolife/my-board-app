import type { Metadata } from "next";
import "./globals.css";
import { NoMuiProviders } from "./providers-no-mui";
import ModernHeader from "@/components/ModernHeader";

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
        <NoMuiProviders>
          <ModernHeader />
          <main>{children}</main>
        </NoMuiProviders>
      </body>
    </html>
  );
}