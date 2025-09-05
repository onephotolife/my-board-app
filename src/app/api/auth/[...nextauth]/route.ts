import NextAuth from 'next-auth';

import { authOptions } from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// NextAuth App Router 正式パターン
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
