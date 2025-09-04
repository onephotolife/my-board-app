import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { connectDB } from '@/lib/db/mongodb-local';
import Post from '@/lib/models/Post';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const days = Math.min(Math.max(parseInt(url.searchParams.get('days') || '7', 10), 1), 90);
    const limit = Math.min(Math.max(parseInt(url.searchParams.get('limit') || '50', 10), 1), 100);

    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    await connectDB();
    const agg = await Post.aggregate([
      { $match: { createdAt: { $gte: since }, status: 'published' } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: limit },
      { $project: { key: '$_id', count: 1, _id: 0 } },
    ]);

    return NextResponse.json({ success: true, data: agg });
  } catch (error) {
    console.error('[TAGS-TRENDING-ERROR]', error);
    return NextResponse.json({ success: false, error: 'TRENDING_FAILED' }, { status: 500 });
  }
}
