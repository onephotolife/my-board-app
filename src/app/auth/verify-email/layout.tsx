import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'メール確認 | 会員制掲示板',
  description: 'メールアドレスの確認を行います',
};

export default function VerifyEmailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // verify-emailページは独自のレイアウト（ヘッダーなし）を使用
  return <>{children}</>;
}