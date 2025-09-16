import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { getToken } from 'next-auth/jwt';

import type { SuggestItem } from '@/types/api/users';
import { okJson, errorJson, nanoIdLike } from '@/lib/api/errors';
import { ipFrom, ipHash, qHash, audit } from '@/lib/api/audit';
import { withSpan } from '@/lib/api/otel';
import { rateLimitConsume, rateKey } from '@/lib/api/rate-limit';
import { normalizeJa } from '@/lib/search/ja-normalize';
import { suggestLocal } from '@/lib/search/engine-local';
import { suggestAtlas } from '@/lib/search/engine-atlas';
import { connectDB } from '@/lib/db/mongodb';
import { isTestBypass, testSuggest } from '@/lib/api/test-bypass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  q: z.string().min(1).max(50),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(Number(process.env.SEARCH_SUGGEST_LIMIT || 10))
    .default(Number(process.env.SEARCH_SUGGEST_LIMIT || 10)),
});

export async function GET(req: NextRequest) {
  if (isTestBypass(req.headers)) {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || '';
    const limitRaw = searchParams.get('limit');
    const limit = Math.max(
      1,
      Math.min(
        Number(process.env.SEARCH_SUGGEST_LIMIT || 10),
        limitRaw ? Number(limitRaw) : Number(process.env.SEARCH_SUGGEST_LIMIT || 10)
      )
    );
    const items = q ? testSuggest(q, limit) : [];
    return okJson({ q, items }, 200);
  }

  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_SUGGEST_PER_MIN || 60);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:suggest'),
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
      limit: searchParams.get('limit') || undefined,
    });
    if (!parsed.success) {
      return errorJson('不正なパラメータです', 422, 'VALIDATION_ERROR', errId, rlHeaders);
    }

    const { q, limit } = parsed.data;
    await connectDB();

    const engine = (process.env.SEARCH_ENGINE || 'local').toLowerCase();
    let items: SuggestItem[] = [];

    await withSpan('users.suggest', { engine }, async () => {
      if (engine === 'atlas') {
        try {
          items = (await suggestAtlas(q, limit)) as SuggestItem[];
        } catch (error) {
          if (String(process.env.SEARCH_ATLAS_FALLBACK_TO_LOCAL || '1') === '1') {
            items = (await suggestLocal(q, limit)) as SuggestItem[];
          } else {
            throw error;
          }
        }
      } else {
        items = (await suggestLocal(q, limit)) as SuggestItem[];
      }
    });

    audit('USER_SUGGEST', {
      userId: token.sub || token.id || null,
      qHash: qHash(normalizeJa(q)),
      resultCount: items.length,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ q, items }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/users/suggest] failed', error);
    audit('USER_SUGGEST', {
      userId: null,
      qHash: null,
      resultCount: 0,
      ua: req.headers.get('user-agent'),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('サジェストに失敗しました', 500, 'SUGGEST_ERROR', errId, rlHeaders);
  }
}
