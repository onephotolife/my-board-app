/* eslint-disable @typescript-eslint/no-explicit-any */
// ==== [SEARCH] atlas engine using $search (STRICT120) ====
import User from '@/lib/models/User';

const IDX_SEARCH = 'users_search';
const IDX_SUGGEST = 'users_suggest';

export async function suggestAtlas(q: string, limit: number) {
  const pipeline: any[] = [
    {
      $search: {
        index: IDX_SUGGEST,
        autocomplete: {
          query: q,
          path: ['search.nameNormalized', 'search.nameYomi'],
          fuzzy: { maxEdits: 1, prefixLength: 1 },
        },
      },
    },
    { $limit: limit },
    { $project: { _id: 1, name: 1, avatar: 1 } },
  ];

  const items = await (User as any).aggregate(pipeline);
  return items.map((u: any) => ({
    id: String(u._id),
    displayName: u.name,
    avatarUrl: u.avatar || null,
  }));
}

export async function searchAtlas(q: string, page: number, limit: number) {
  const pipeline: any[] = [
    {
      $search: {
        index: IDX_SEARCH,
        compound: {
          should: [
            {
              text: {
                query: q,
                path: ['name', 'bio'],
                analyzer: 'lucene.japanese',
                score: { boost: { value: 2 } },
              },
            },
            {
              autocomplete: {
                query: q,
                path: ['search.nameNormalized', 'search.nameYomi'],
                fuzzy: { maxEdits: 1, prefixLength: 1 },
              },
            },
          ],
          minimumShouldMatch: 1,
        },
      },
    },
    { $addFields: { score: { $meta: 'searchScore' } } },
    { $sort: { score: -1 } },
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
