import { performance } from 'node:perf_hooks';

const COOKIE = process.env.AUTH_COOKIE || '';
const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function call(path) {
  const t0 = performance.now();
  const res = await fetch(BASE + path, {
    headers: COOKIE ? { cookie: COOKIE } : undefined,
    credentials: 'include',
  });
  const ms = performance.now() - t0;
  return { status: res.status, ms };
}

function p95(arr) {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = Math.max(0, Math.ceil(0.95 * sorted.length) - 1);
  return sorted[idx];
}

async function main() {
  const runs = Number(process.env.N || 30);
  const suggestDur = [];
  const searchDur = [];

  for (let i = 0; i < runs; i += 1) {
    const q = `やま${i % 5}`;
    const sRes = await call(`/api/users/suggest?q=${encodeURIComponent(q)}&limit=5`);
    const qRes = await call(`/api/users/search?q=${encodeURIComponent(q)}&page=1&limit=10`);
    suggestDur.push(sRes.ms);
    searchDur.push(qRes.ms);
  }

  console.log(JSON.stringify({
    samples: runs,
    p95: {
      suggest: p95(suggestDur),
      search: p95(searchDur),
    },
  }));

  const burstResults = await Promise.all(
    Array.from({ length: Number(process.env.BURST || 80) }, () =>
      call('/api/users/suggest?q=429テスト')
    )
  );
  const n429 = burstResults.filter((r) => r.status === 429).length;
  console.log(JSON.stringify({ burst: burstResults.length, rateLimited: n429 }));
}

main().catch((error) => {
  console.error('[bench-step02] failed', error);
  process.exit(1);
});
