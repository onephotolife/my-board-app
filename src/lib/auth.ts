import NextAuth from "next-auth";
// import { authConfig } from "./auth.config";
import { simpleAuthConfig } from "./auth-simple.config";

// シンプルな設定で確実に動作させる
const authInstance = NextAuth(simpleAuthConfig);

export const { handlers, signIn, signOut, auth } = authInstance;
export { simpleAuthConfig as authOptions };