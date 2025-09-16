import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import type { SearchItem } from '@/types/api/users';
import { okJson, errorJson, nanoIdLike } from '@/lib/api/errors';
import { ipFrom, ipHash, qHash, audit } from '@/lib/api/audit';
import { withSpan } from '@/lib/api/otel';
import { rateLimitConsume, rateKey } from '@/lib/api/rate-limit';
import { normalizeJa } from '@/lib/search/ja-normalize';
import { searchLocal } from '@/lib/search/engine-local';
import { searchAtlas } from '@/lib/search/engine-atlas';
import { connectDB } from '@/lib/db/mongodb';
import { isTestBypass, testSearch } from '@/lib/api/test-bypass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_LIMIT = Number(process.env.SEARCH_RESULT_LIMIT_MAX || 50);
const schema = z.object({
  q: z.string().min(1).max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(MAX_LIMIT).default(Math.min(20, MAX_LIMIT)),
});

export async function GET(req: NextRequest) {
  if (isTestBypass(req)) {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const page = Number(searchParams.get('page') || '1') || 1;
    const limit = Number(searchParams.get('limit') || '20') || 20;
    const items = q ? testSearch(q, page, limit) : [];
    return okJson({ q, items, page, limit });
  }

  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_SEARCH_PER_MIN || 20);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:search'),
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
    const parsed = schema.safeParse({
      q: searchParams.get('q') || '',
      page: searchParams.get('page') || undefined,
      limit: searchParams.get('limit') || undefined,
    });
    if (!parsed.success) {
      return errorJson('不正なパラメータです', 422, 'VALIDATION_ERROR', errId, rlHeaders);
    }

    const { q, page, limit } = parsed.data;
    await connectDB();

    const engine = (process.env.SEARCH_ENGINE || 'local').toLowerCase();
    let items: SearchItem[] = [];

    await withSpan('users.search', { engine }, async () => {
      if (engine === 'atlas') {
        try {
          items = (await searchAtlas(q, page, limit)) as SearchItem[];
        } catch (error) {
          if (String(process.env.SEARCH_ATLAS_FALLBACK_TO_LOCAL || '1') === '1') {
            items = (await searchLocal(q, page, limit)) as SearchItem[];
          } else {
            throw error;
          }
        }
      } else {
        items = (await searchLocal(q, page, limit)) as SearchItem[];
      }
    });

    audit('USER_SEARCH', {
      userId: token.sub || token.id || null,
      qHash: qHash(normalizeJa(q)),
      resultCount: items.length,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ q, items, page, limit }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/users/search] failed', error);
    audit('USER_SEARCH', {
      userId: null,
      qHash: null,
      resultCount: 0,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('検索に失敗しました', 500, 'SEARCH_ERROR', errId, rlHeaders);
  }
}
