/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */
import 'dotenv/config';
import mongoose from 'mongoose';

import User from '@/lib/models/User';
import { normalizeJa, toYomi, buildPrefixes, buildNgrams } from '@/lib/search/ja-normalize';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
const DRY_RUN = (process.env.DRY_RUN ?? 'false').toLowerCase() === 'true';
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 200);
const FILTER = process.env.FILTER ? JSON.parse(process.env.FILTER) : {};

function buildSearchFields(u: any) {
  const name = u.name || '';
  const bio = u.bio || '';
  const nameNormalized = normalizeJa(name);
  const nameYomi = toYomi(name);
  const bioNormalized = normalizeJa(bio);
  return {
    nameNormalized,
    nameYomi,
    namePrefixes: buildPrefixes(nameNormalized, 10),
    nameYomiPrefixes: buildPrefixes(nameYomi, 20),
    bioNormalized,
    bioNgrams: buildNgrams(bioNormalized),
  };
}

async function main() {
  console.log('[BF] connecting:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);

  const total = await User.countDocuments(FILTER as any);
  console.log('[BF] target docs:', total);

  const cursor = (User as any)
    .find(FILTER, { name: 1, bio: 1, searchNameNormalized: 1, searchNameYomi: 1 })
    .lean()
    .cursor({ batchSize: BATCH_SIZE });
  let processed = 0;
  let updated = 0;
  const bulkOps: any[] = [];

  for await (const u of cursor as any) {
    processed++;
    const search = buildSearchFields(u);
    bulkOps.push({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            search,
            searchNameNormalized: u.searchNameNormalized ?? search.nameNormalized,
            searchNameYomi: u.searchNameYomi ?? search.nameYomi,
          },
        },
        upsert: false,
      },
    });
    if (bulkOps.length >= BATCH_SIZE) {
      if (!DRY_RUN) {
        const res = await (User as any).bulkWrite(bulkOps, { ordered: false });
        updated += res.modifiedCount || 0;
      } else {
        console.log('[BF][DRY] bulkOps len:', bulkOps.length);
      }
      bulkOps.length = 0;
    }
    if (processed % 1000 === 0) console.log('[BF] progress:', processed, '/', total);
  }

  if (bulkOps.length) {
    if (!DRY_RUN) {
      const res = await (User as any).bulkWrite(bulkOps, { ordered: false });
      updated += res.modifiedCount || 0;
    } else {
      console.log('[BF][DRY] bulkOps len:', bulkOps.length);
    }
  }

  console.log('[BF] processed:', processed, 'updated:', updated, 'DRY_RUN:', DRY_RUN);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('[BF] failed:', e);
  process.exit(1);
});
