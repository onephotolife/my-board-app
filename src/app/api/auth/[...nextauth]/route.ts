import NextAuth from "@/lib/auth";

// Next.js 15 App Router用のnamed export（default exportを削除）
const handler = NextAuth;

export { handler as GET, handler as POST };