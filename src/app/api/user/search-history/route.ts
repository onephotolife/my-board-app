import type { NextRequest } from 'next/server';
import { z } from 'zod';
import mongoose, { Schema, Types } from 'mongoose';
import { getToken } from 'next-auth/jwt';

import { okJson, errorJson, nanoIdLike } from '@/lib/api/errors';
import { ipFrom, ipHash, audit } from '@/lib/api/audit';
import { rateLimitConsume, rateKey } from '@/lib/api/rate-limit';
import { connectDB } from '@/lib/db/mongodb';
import { normalizeJa } from '@/lib/search/ja-normalize';
import {
  isTestBypass,
  getTestHistory,
  addTestHistory,
  deleteTestHistory,
} from '@/lib/api/test-bypass';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ItemSchema = new Schema(
  {
    q: String,
    normalizedQ: String,
    count: Number,
    lastSearchedAt: Date,
  },
  { _id: false }
);

type HistoryItem = {
  q: string;
  normalizedQ: string;
  count: number;
  lastSearchedAt: Date;
};

interface HistoryDoc {
  userId: Types.ObjectId;
  items: HistoryItem[];
  updatedAt?: Date;
}

const HistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, index: true, unique: true },
    items: { type: [ItemSchema], default: [] },
    updatedAt: Date,
  },
  { collection: 'user_search_histories' }
);

const History =
  mongoose.models.UserSearchHistory || mongoose.model('UserSearchHistory', HistorySchema);

export async function GET(req: NextRequest) {
  if (isTestBypass(req.headers)) {
    return okJson({ items: getTestHistory() });
  }

  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_HISTORY_PER_MIN || 30);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:history:get'),
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

    await connectDB();
    const userId = new Types.ObjectId((token.id || token.sub) as string);
    const doc = await History.findOne({ userId }).lean<HistoryDoc>();

    audit('USER_SEARCH_HISTORY_GET', {
      userId: String(userId),
      resultCount: doc?.items?.length || 0,
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ items: doc?.items || [] }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/user/search-history][GET] failed', error);
    audit('USER_SEARCH_HISTORY_GET', {
      userId: null,
      resultCount: 0,
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('履歴取得に失敗しました', 500, 'HISTORY_GET_ERROR', errId, rlHeaders);
  }
}

export async function POST(req: NextRequest) {
  if (isTestBypass(req.headers)) {
    const body = await req.json().catch(() => null);
    const q = typeof body?.q === 'string' ? body.q : '';
    if (!q) {
      return errorJson('不正なパラメータです', 422, 'VALIDATION_ERROR', nanoIdLike());
    }
    addTestHistory(q);
    return okJson({ ok: true });
  }

  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_HISTORY_PER_MIN || 30);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:history:post'),
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

    const body = await req.json().catch(() => null);
    const schema = z.object({ q: z.string().min(1).max(100) });
    const parsed = schema.safeParse({ q: body?.q || '' });
    if (!parsed.success) {
      return errorJson('不正なパラメータです', 422, 'VALIDATION_ERROR', errId);
    }

    await connectDB();
    const q = parsed.data.q;
    const normalizedQ = normalizeJa(q);
    const userId = new Types.ObjectId((token.id || token.sub) as string);
    const now = new Date();

    const doc = (await History.findOne({ userId })) as (HistoryDoc & mongoose.Document) | null;
    if (!doc) {
      await History.create({
        userId,
        items: [{ q, normalizedQ, count: 1, lastSearchedAt: now }],
        updatedAt: now,
      });
    } else {
      const idx = doc.items.findIndex((it: HistoryItem) => it.normalizedQ === normalizedQ);
      if (idx >= 0) {
        doc.items[idx].count += 1;
        doc.items[idx].lastSearchedAt = now;
      } else {
        doc.items.unshift({ q, normalizedQ, count: 1, lastSearchedAt: now });
        if (doc.items.length > 50) {
          doc.items = doc.items.slice(0, 50);
        }
      }
      doc.updatedAt = now;
      await doc.save();
    }

    audit('USER_SEARCH_HISTORY_POST', {
      userId: String(userId),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ ok: true }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/user/search-history][POST] failed', error);
    audit('USER_SEARCH_HISTORY_POST', {
      userId: null,
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('履歴保存に失敗しました', 500, 'HISTORY_POST_ERROR', errId, rlHeaders);
  }
}

export async function DELETE(req: NextRequest) {
  if (isTestBypass(req.headers)) {
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q') || undefined;
    deleteTestHistory(q || undefined);
    return okJson({ ok: true });
  }

  const started = Date.now();
  const errId = nanoIdLike();
  const ip = ipFrom(req);

  const limitPerMin = Number(process.env.RATE_LIMIT_HISTORY_PER_MIN || 30);
  const { allowed, remaining, limit, resetMs } = rateLimitConsume(
    rateKey(ip, 'users:history:delete'),
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

    await connectDB();
    const searchParams = req.nextUrl.searchParams;
    const q = searchParams.get('q');
    const userId = new Types.ObjectId((token.id || token.sub) as string);

    const doc = (await History.findOne({ userId })) as (HistoryDoc & mongoose.Document) | null;
    if (!doc) {
      return okJson({ ok: true }, 200, rlHeaders);
    }

    if (!q) {
      doc.items = [];
    } else {
      const normalizedQ = normalizeJa(q);
      doc.items = doc.items.filter((it: HistoryItem) => it.normalizedQ !== normalizedQ);
    }
    doc.updatedAt = new Date();
    await doc.save();

    audit('USER_SEARCH_HISTORY_DELETE', {
      userId: String(userId),
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: null,
    });

    return okJson({ ok: true }, 200, rlHeaders);
  } catch (error) {
    console.error('[api/user/search-history][DELETE] failed', error);
    audit('USER_SEARCH_HISTORY_DELETE', {
      userId: null,
      ipHash: ipHash(ip),
      latencyMs: Date.now() - started,
      errorId: errId,
    });
    return errorJson('履歴削除に失敗しました', 500, 'HISTORY_DELETE_ERROR', errId, rlHeaders);
  }
}
