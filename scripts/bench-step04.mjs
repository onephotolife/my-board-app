import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const SAMPLE_SIZE = Number(process.env.N || 30);
const SUGGEST_LIMIT = Number(process.env.P95_SUGGEST_MAX || 120);
const SEARCH_LIMIT = Number(process.env.P95_SEARCH_MAX || 300);

async function call(path) {
  const started = performance.now();
  const res = await fetch(BASE + path, {
    headers: { 'x-test-auth': '1' }
  });
  const duration = performance.now() - started;
  return { status: res.status, duration };
}

function p95(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.floor(sorted.length * 0.95) - 1));
  return sorted[index];
}

async function main() {
  const suggestDurations = [];
  const searchDurations = [];

  for (let i = 0; i < SAMPLE_SIZE; i += 1) {
    const query = 'やま';
    const suggest = await call(`/api/users/suggest?q=${encodeURIComponent(query)}`);
    const search = await call(`/api/users/search?q=${encodeURIComponent(query)}&page=1&limit=10`);
    suggestDurations.push(suggest.duration);
    searchDurations.push(search.duration);
  }

  const suggestP95 = p95(suggestDurations);
  const searchP95 = p95(searchDurations);

  const summary = {
    samples: SAMPLE_SIZE,
    p95: {
      suggest: Math.round(suggestP95),
      search: Math.round(searchP95)
    },
    limits: {
      suggest: SUGGEST_LIMIT,
      search: SEARCH_LIMIT
    }
  };

  console.log(JSON.stringify(summary));

  if (suggestP95 > SUGGEST_LIMIT || searchP95 > SEARCH_LIMIT) {
    console.error('P95 gate failed', summary);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
