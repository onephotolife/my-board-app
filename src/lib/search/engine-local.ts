/* eslint-disable @typescript-eslint/no-explicit-any */
// ==== [SEARCH] local engine using search.* fields (STRICT120) ====
import { Types } from 'mongoose';

import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';
import { normalizeJa, toYomi, buildNgrams } from '@/lib/search/ja-normalize';

export async function suggestLocal(q: string, limit: number) {
  const qNorm = normalizeJa(q);
  const qYomi = toYomi(q);

  const rows = await User.find({
    $or: [{ 'search.namePrefixes': qNorm }, { 'search.nameYomiPrefixes': qYomi }],
  })
    .select({ _id: 1, name: 1, avatar: 1 })
    .limit(limit)
    .lean();

  return rows.map((u: any) => ({
    id: String(u._id),
    displayName: u.name,
    avatarUrl: u.avatar || null,
  }));
}

export async function searchLocal(q: string, page: number, limit: number) {
  const qNorm = normalizeJa(q);
  const qYomi = toYomi(q);
  const qNgrams = buildNgrams(qNorm);

  const pipeline: any[] = [
    {
      $match: {
        $or: [
          { 'search.namePrefixes': qNorm },
          { 'search.nameYomiPrefixes': qYomi },
          { 'search.bioNgrams': { $in: qNgrams } },
        ],
      },
    },
    {
      $addFields: {
        score: {
          $add: [
            { $cond: [{ $in: [qNorm, '$search.namePrefixes'] }, 3, 0] },
            { $cond: [{ $in: [qYomi, '$search.nameYomiPrefixes'] }, 2, 0] },
            { $size: { $setIntersection: ['$search.bioNgrams', qNgrams] } },
            { $divide: [{ $ifNull: ['$stats.followerCount', 0] }, 100] },
          ],
        },
      },
    },
    { $sort: { score: -1, 'stats.followerCount': -1, updatedAt: -1 } },
    { $skip: (page - 1) * limit },
    { $limit: limit },
    { $project: { _id: 1, name: 1, bio: 1, avatar: 1, score: 1, 'stats.followerCount': 1 } },
  ];

  const items = await (User as any).aggregate(pipeline);
  return items.map((u: any) => ({
    id: String(u._id),
    displayName: u.name,
    avatarUrl: u.avatar || null,
    bio: u.bio || '',
    score: u.score || 0,
    followerCount: u.stats?.followerCount ?? 0,
  }));
}

export async function recommendLocal(userId: string, limit: number) {
  const oid = new Types.ObjectId(userId);

  const pipeline: any[] = [
    { $match: { follower: oid } },
    {
      $lookup: {
        from: 'follows',
        localField: 'following',
        foreignField: 'follower',
        as: 'second',
      },
    },
    { $unwind: '$second' },
    { $replaceRoot: { newRoot: '$second' } },
    { $match: { following: { $ne: oid } } },
    {
      $group: {
        _id: '$following',
        commonFollows: { $sum: 1 },
      },
    },
    { $sort: { commonFollows: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 0,
        id: { $toString: '$user._id' },
        displayName: '$user.name',
        avatarUrl: '$user.avatar',
        followerCount: '$user.stats.followerCount',
        commonFollows: 1,
      },
    },
  ];

  const rows = await (Follow as any).aggregate(pipeline);
  return rows;
}
