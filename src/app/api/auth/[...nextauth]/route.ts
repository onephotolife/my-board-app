import NextAuth from "next-auth";

import { authOptions } from "@/lib/auth";

// デバッグログ追加 - ROOT CAUSE ANALYSIS
console.warn('🔍 [ROOT CAUSE] NextAuth route handler loaded at:', new Date().toISOString());
console.warn('🔍 [ROOT CAUSE] authOptions providers count:', authOptions.providers?.length);
console.warn('🔍 [ROOT CAUSE] Provider details:', authOptions.providers?.map(p => ({
  id: (p as any).id,
  name: (p as any).name,
  type: (p as any).type
})));

// Next.js 15 App Router用のnamed export
const handler = NextAuth(authOptions);

// ハンドラーの存在確認
console.warn('🔍 [ROOT CAUSE] Handler created:', typeof handler);
console.warn('🔍 [ROOT CAUSE] Handler methods:', Object.keys(handler || {}));

export { handler as GET, handler as POST };