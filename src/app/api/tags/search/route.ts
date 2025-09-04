import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import Tag from '@/lib/models/Tag';
import { normalizeTag } from '@/app/utils/hashtag';
import { withRateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest) {
  return withRateLimit(
    req,
    async (request) => {
      try {
        const url = new URL(request.url);
        const qRaw = url.searchParams.get('q') || '';
        const limitRaw = url.searchParams.get('limit') || '10';
        const q = normalizeTag(qRaw);
        const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 50);

        if (!q) {
          return NextResponse.json({ success: true, data: [] });
        }

        await connectDB();
        const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const items = await Tag.find({ key: { $regex: regex } })
          .sort({ countTotal: -1 })
          .limit(limit)
          .lean();

        return NextResponse.json({ success: true, data: items });
      } catch (error) {
        console.error('[TAGS-SEARCH-ERROR]', error);
        return NextResponse.json({ success: false, error: 'SEARCH_FAILED' }, { status: 500 });
      }
    },
    { windowMs: 60 * 1000, max: 60 }
  );
}
