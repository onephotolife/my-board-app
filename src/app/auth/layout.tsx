export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 認証ページはヘッダーなしのレイアウト
  return <>{children}</>;
}