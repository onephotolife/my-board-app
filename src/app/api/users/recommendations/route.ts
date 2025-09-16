import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import type { RecoItem } from '@/types/api/users';
import { okJson, errorJson, nanoIdLike } from '@/lib/api/errors';
import { ipFrom, ipHash, audit } from '@/lib/api/audit';
import { rateLimitConsume, rateKey } from '@/lib/api/rate-limit';
import { recommendLocal } from '@/lib/search/engine-local';
import { connectDB } from '@/lib/db/mongodb';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(Number(process.env.SEARCH_RECO_LIMIT || 20))
    .default(Number(process.env.SEARCH_RECO_LIMIT || 20)),
});

export async function GET(req: NextRequest) {
  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_RECO_PER_MIN || 30);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:reco'),
    limitPerMin,
    60_000
  );
  const rlHeaders = process.env.SEARCH_RATELIMIT_RESPONSE_HEADERS
    ? {
        'x-ratelimit-limit': String(limit),
        'x-ratelimit-remaining': String(remaining),
        'x-ratelimit-window-ms': String(resetMs),
      }
    : undefined;

  if (!allowed) {
    return errorJson('Too Many Requests', 429, 'RATE_LIMITED', errId, rlHeaders);
  }

  try {
    const token = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      return errorJson('認証が必要です', 401, 'UNAUTHORIZED', errId, rlHeaders);
    }

    const searchParams = req.nextUrl.searchParams;
    const parsed = schema.safeParse({ limit: searchParams.get('limit') || undefined });
    if (!parsed.success) {
      return errorJson('不正なパラメータです', 422, 'VALIDATION_ERROR', errId, rlHeaders);
    }

    const { limit } = parsed.data;
    await connectDB();
    const me = (token.sub || token.id) as string;

    const items = (await recommendLocal(me, limit)) as RecoItem[];

    audit('USER_RECOMMENDATIONS', {
      userId: me,
      resultCount: items.length,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ items }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/users/recommendations] failed', error);
    audit('USER_RECOMMENDATIONS', {
      userId: null,
      resultCount: 0,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('おすすめ取得に失敗しました', 500, 'RECOMMEND_ERROR', errId, rlHeaders);
  }
}
