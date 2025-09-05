import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import Tag from '@/lib/models/Tag';
import { normalizeTag } from '@/app/utils/hashtag';
import { withRateLimit } from '@/lib/rateLimit';

interface PaginationInfo {
  page: number;
  limit: number;
  hasNext: boolean;
}

export async function GET(req: NextRequest) {
  return withRateLimit(
    req,
    async (request) => {
      try {
        const url = new URL(request.url);

        // Parse query parameters
        const qRaw = url.searchParams.get('q') || '';
        const sort = url.searchParams.get('sort') || 'popular'; // popular | recent
        const pageRaw = url.searchParams.get('page') || '1';
        const limitRaw = url.searchParams.get('limit') || '20';

        // Normalize and validate parameters
        const q = normalizeTag(qRaw);
        const page = Math.max(parseInt(pageRaw, 10) || 1, 1);
        const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 20, 1), 50);

        // Connect to database
        await connectDB();

        // Build query
        let query = {};
        if (q) {
          const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
          query = { key: { $regex: regex } };
        }

        // Determine sort order
        let sortOrder = {};
        if (sort === 'recent') {
          sortOrder = { lastUsedAt: -1 };
        } else {
          // Default to popular
          sortOrder = { countTotal: -1 };
        }

        // Execute query with pagination
        const skip = (page - 1) * limit;

        // Fetch data with limit + 1 to check if there's next page
        const items = await Tag.find(query)
          .sort(sortOrder)
          .skip(skip)
          .limit(limit + 1)
          .lean();

        // Check if there's a next page
        const hasNext = items.length > limit;

        // Return only the requested limit
        const data = items.slice(0, limit);

        const pagination: PaginationInfo = {
          page,
          limit,
          hasNext,
        };

        return NextResponse.json({
          success: true,
          data,
          pagination,
        });
      } catch (error) {
        console.error('[TAGS-INDEX-ERROR]', error);
        return NextResponse.json({ success: false, error: 'INDEX_FAILED' }, { status: 500 });
      }
    },
    { windowMs: 60 * 1000, max: 60 }
  );
}
