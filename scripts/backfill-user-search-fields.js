/* eslint-disable @typescript-eslint/no-require-imports */

/* eslint-disable no-console */
// ==== backfill-user-search-fields.js (offline-friendly) ====
require('dotenv/config');
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
const DRY_RUN = String(process.env.DRY_RUN || 'false').toLowerCase() === 'true';
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 200);
const FILTER = process.env.FILTER ? JSON.parse(process.env.FILTER) : {};

function normalizeJa(s) {
  return (s || '')
    .normalize('NFKC')
    .replace(/[ \u3000]+/g, ' ')
    .replace(/[ｰ—―−‐]/g, 'ー')
    .trim()
    .toLowerCase();
}
function kataToHiraOffline(input) {
  let out = '';
  const n = normalizeJa(input);
  for (const ch of n) {
    const code = ch.codePointAt(0);
    if (code >= 0x30a1 && code <= 0x30f6) out += String.fromCodePoint(code - 0x60);
    else out += ch;
  }
  return out;
}
function toYomi(s) {
  return kataToHiraOffline(s);
}
function buildPrefixes(s, max = 20) {
  const n = normalizeJa(s);
  const lim = Math.min(max, n.length);
  const out = [];
  for (let i = 1; i <= lim; i++) out.push(n.slice(0, i));
  return Array.from(new Set(out));
}
function buildNgrams(s, min = 2, max = 3) {
  const n = normalizeJa(s);
  const grams = [];
  for (let k = min; k <= max; k++)
    for (let i = 0; i + k <= n.length; i++) grams.push(n.slice(i, i + k));
  return Array.from(new Set(grams));
}

async function main() {
  console.log('[BF-JS] connecting:', MONGODB_URI);
  await mongoose.connect(MONGODB_URI);
  const db = mongoose.connection.db;
  const users = db.collection('users');

  const total = await users.countDocuments(FILTER);
  console.log('[BF-JS] target docs:', total);

  const cursor = users.find(FILTER, {
    projection: { name: 1, bio: 1, searchNameNormalized: 1, searchNameYomi: 1 },
  });
  let processed = 0,
    updated = 0;
  let ops = [];

  while (await cursor.hasNext()) {
    const u = await cursor.next();
    processed++;
    const name = u.name || '';
    const bio = u.bio || '';
    const nameNormalized = normalizeJa(name);
    const nameYomi = toYomi(name);
    const bioNormalized = normalizeJa(bio);
    const search = {
      nameNormalized,
      nameYomi,
      namePrefixes: buildPrefixes(nameNormalized, 10),
      nameYomiPrefixes: buildPrefixes(nameYomi, 20),
      bioNormalized,
      bioNgrams: buildNgrams(bioNormalized),
    };
    ops.push({
      updateOne: {
        filter: { _id: u._id },
        update: {
          $set: {
            search,
            searchNameNormalized: u.searchNameNormalized ?? search.nameNormalized,
            searchNameYomi: u.searchNameYomi ?? search.nameYomi,
          },
        },
      },
    });
    if (ops.length >= BATCH_SIZE) {
      if (!DRY_RUN) {
        const res = await users.bulkWrite(ops, { ordered: false });
        updated += res.modifiedCount || 0;
      } else {
        console.log('[BF-JS][DRY] bulk ops:', ops.length);
      }
      ops = [];
    }
    if (processed % 1000 === 0) console.log('[BF-JS] progress:', processed, '/', total);
  }

  if (ops.length) {
    if (!DRY_RUN) {
      const res = await users.bulkWrite(ops, { ordered: false });
      updated += res.modifiedCount || 0;
    } else {
      console.log('[BF-JS][DRY] bulk ops:', ops.length);
    }
  }

  console.log('[BF-JS] processed:', processed, 'updated:', updated, 'DRY_RUN:', DRY_RUN);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('[BF-JS] failed:', e);
  process.exit(1);
});
