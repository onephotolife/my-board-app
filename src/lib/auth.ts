import NextAuth from "next-auth";
import { authConfig } from "./auth.config";

// NextAuthインスタンスの作成（環境変数を確実に使用）
const authInstance = NextAuth({
  ...authConfig,
  // 環境変数から直接設定（Vercelで確実に動作させるため）
  secret: process.env.NEXTAUTH_SECRET || 'blankinai-member-board-secret-key-2024-production',
});

export const { handlers, signIn, signOut, auth } = authInstance;
export { authConfig as authOptions };