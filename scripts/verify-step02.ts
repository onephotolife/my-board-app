#!/usr/bin/env ts-node
import { performance } from 'node:perf_hooks';

import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import * as nextAuthJwt from 'next-auth/jwt';

import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import { GET as suggestGet } from '@/app/api/users/suggest/route';
import { GET as searchGet } from '@/app/api/users/search/route';
import { GET as recoGet } from '@/app/api/users/recommendations/route';
import {
  GET as historyGet,
  POST as historyPost,
  DELETE as historyDelete,
} from '@/app/api/user/search-history/route';

type HttpMethod = 'GET' | 'POST' | 'DELETE';

type JsonRecord = Record<string, unknown>;

type FetchResult = {
  status: number;
  body: JsonRecord | null;
  durationMs: number;
  errorId?: string;
  headers: Record<string, string>;
};

class MockHeaders {
  private map = new Map<string, string>();

  constructor(init?: Record<string, string>) {
    if (init) {
      for (const [key, value] of Object.entries(init)) {
        this.map.set(key.toLowerCase(), value);
      }
    }
  }

  get(name: string) {
    return this.map.get(name.toLowerCase()) ?? null;
  }

  set(name: string, value: string) {
    this.map.set(name.toLowerCase(), value);
  }
}

class MockRequest {
  public nextUrl: URL;
  public headers: MockHeaders;
  public method: string;
  public cookies: { get: (name: string) => { value: string } | undefined };
  private body?: string;

  constructor(url: string, method: HttpMethod, headers: Record<string, string>, body?: string) {
    this.nextUrl = new URL(url, 'https://example.local');
    this.headers = new MockHeaders(headers);
    this.method = method;
    this.body = body;
    const cookieHeader = headers.cookie || '';
    const cookieMap = new Map<string, string>();
    cookieHeader
      .split(';')
      .map((chunk) => chunk.trim())
      .filter(Boolean)
      .forEach((pair) => {
        const [name, ...rest] = pair.split('=');
        cookieMap.set(name, rest.join('='));
      });
    this.cookies = {
      get: (name: string) => {
        const val = cookieMap.get(name);
        return val !== undefined ? { value: val } : undefined;
      },
    };
  }

  async json() {
    if (!this.body) {
      throw new Error('Body is empty');
    }
    return JSON.parse(this.body);
  }
}

Object.assign(process.env, {
  NODE_ENV: process.env.NODE_ENV || 'test',
  AUTH_SECRET: process.env.AUTH_SECRET || 'test-secret-key',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET || 'test-secret-key',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/boardDB',
  SEARCH_ENGINE: process.env.SEARCH_ENGINE || 'local',
  SEARCH_SUGGEST_LIMIT: process.env.SEARCH_SUGGEST_LIMIT || '10',
  SEARCH_RESULT_LIMIT_MAX: process.env.SEARCH_RESULT_LIMIT_MAX || '50',
  SEARCH_RECO_LIMIT: process.env.SEARCH_RECO_LIMIT || '20',
  RATE_LIMIT_SUGGEST_PER_MIN: process.env.RATE_LIMIT_SUGGEST_PER_MIN || '60',
  RATE_LIMIT_SEARCH_PER_MIN: process.env.RATE_LIMIT_SEARCH_PER_MIN || '20',
  RATE_LIMIT_RECO_PER_MIN: process.env.RATE_LIMIT_RECO_PER_MIN || '30',
  RATE_LIMIT_HISTORY_PER_MIN: process.env.RATE_LIMIT_HISTORY_PER_MIN || '30',
  SEARCH_LOG_SALT: process.env.SEARCH_LOG_SALT || 'step02-verification',
  SEARCH_RATELIMIT_RESPONSE_HEADERS: process.env.SEARCH_RATELIMIT_RESPONSE_HEADERS || '1',
  SEARCH_ATLAS_FALLBACK_TO_LOCAL: process.env.SEARCH_ATLAS_FALLBACK_TO_LOCAL || '1',
});

const SECRET = process.env.NEXTAUTH_SECRET || 'test-secret-key';

type TokenPayload = {
  sub?: string;
  id?: string;
  email?: string;
  name?: string;
  emailVerified?: boolean;
};

type MutableNextAuthJwt = typeof nextAuthJwt & {
  getToken: (params?: unknown) => Promise<TokenPayload | null>;
};

const mutableJwt = nextAuthJwt as MutableNextAuthJwt;
const originalGetToken = mutableJwt.getToken;

async function buildAuthContext(): Promise<{ userId: string; email: string; token: string }> {
  await connectDB();
  const user = await User.findOne({}).lean<{
    _id: mongoose.Types.ObjectId;
    email: string;
    name: string;
  }>();
  if (!user) {
    throw new Error(
      'ユーザーが存在しません。事前に Step01 のバックフィルとサンプルユーザー作成を実施してください。'
    );
  }
  const payload = {
    sub: String(user._id),
    id: String(user._id),
    email: user.email,
    name: user.name,
    emailVerified: true,
  };
  const token = jwt.sign(payload, SECRET, { expiresIn: '30m' });
  return { token, userId: String(user._id), email: user.email };
}

function makeRequest(
  path: string,
  method: HttpMethod,
  cookie?: string,
  ip = '127.0.0.1',
  body?: JsonRecord
): MockRequest {
  const headers: Record<string, string> = {
    'user-agent': 'Step02-Verification/1.0',
    'x-forwarded-for': ip,
  };
  if (cookie) {
    headers.cookie = cookie;
  }
  let bodyString: string | undefined;
  if (body) {
    headers['content-type'] = 'application/json';
    bodyString = JSON.stringify(body);
  }
  return new MockRequest(path, method, headers, bodyString);
}

function isJsonRecord(value: unknown): value is JsonRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function extractErrorId(body: JsonRecord | null): string | undefined {
  if (!body) return undefined;
  const { error } = body;
  if (isJsonRecord(error)) {
    const nested = error.errorId;
    return typeof nested === 'string' ? nested : undefined;
  }
  const direct = body.errorId;
  return typeof direct === 'string' ? direct : undefined;
}

function getItemsCount(result: FetchResult): number {
  if (!isJsonRecord(result.body)) {
    return 0;
  }
  const items = result.body.items;
  if (Array.isArray(items)) {
    return items.length;
  }
  return 0;
}

async function runRequest(
  req: MockRequest,
  handler: (request: unknown) => Promise<Response>
): Promise<FetchResult> {
  const started = performance.now();
  const res = await handler(req as unknown);
  const durationMs = performance.now() - started;
  const headers = Object.fromEntries(res.headers.entries());
  const body = (await res.json().catch(() => null)) as JsonRecord | null;
  const errorId = extractErrorId(body);
  return { status: res.status, body, durationMs, errorId, headers };
}

function percentile(values: number[], percent: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.ceil((percent / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function main() {
  const auth = await buildAuthContext();
  console.warn('✅ 認証トークン生成済み:', { userId: auth.userId, email: auth.email });
  const mockTokenPayload = {
    sub: auth.userId,
    id: auth.userId,
    email: auth.email,
    name: 'Step02 Tester',
    emailVerified: true,
  };

  console.warn('\n[1] 認証エラーパス確認');
  mutableJwt.getToken = async () => null;
  const unauthReq = makeRequest('/api/users/suggest?q=テスト', 'GET');
  const unauthRes = await runRequest(unauthReq, suggestGet);
  const unauthError = isJsonRecord(unauthRes.body) ? unauthRes.body.error : null;
  console.warn('  - 未認証レスポンス:', unauthRes.status, unauthError);

  console.warn('\n[2] 正常ルート呼び出し');
  mutableJwt.getToken = async () => mockTokenPayload;
  const suggestRes = await runRequest(makeRequest('/api/users/suggest?q=やま', 'GET'), suggestGet);
  console.warn('  - suggest:', { status: suggestRes.status, count: getItemsCount(suggestRes) });
  console.warn('    headers:', {
    limit: suggestRes.headers['x-ratelimit-limit'],
    remaining: suggestRes.headers['x-ratelimit-remaining'],
  });

  const searchRes = await runRequest(
    makeRequest('/api/users/search?q=やま&page=1&limit=10', 'GET'),
    searchGet
  );
  console.warn('  - search:', { status: searchRes.status, count: getItemsCount(searchRes) });
  console.warn('    headers:', {
    limit: searchRes.headers['x-ratelimit-limit'],
    remaining: searchRes.headers['x-ratelimit-remaining'],
  });

  const recoRes = await runRequest(
    makeRequest('/api/users/recommendations?limit=10', 'GET'),
    recoGet
  );
  console.warn('  - recommendations:', { status: recoRes.status, count: getItemsCount(recoRes) });

  const historyInitial = await runRequest(
    makeRequest('/api/user/search-history', 'GET'),
    historyGet
  );
  console.warn('  - history GET 初期:', {
    status: historyInitial.status,
    count: getItemsCount(historyInitial),
  });

  const historyPostRes = await runRequest(
    makeRequest('/api/user/search-history', 'POST', undefined, '127.0.0.50', { q: 'ステップ二' }),
    historyPost
  );
  console.warn('  - history POST:', { status: historyPostRes.status, body: historyPostRes.body });

  const historyAfterPost = await runRequest(
    makeRequest('/api/user/search-history', 'GET', undefined, '127.0.0.51'),
    historyGet
  );
  console.warn('  - history GET 再取得:', {
    status: historyAfterPost.status,
    count: getItemsCount(historyAfterPost),
  });

  const historyDeleteRes = await runRequest(
    makeRequest('/api/user/search-history?q=ステップ二', 'DELETE', undefined, '127.0.0.52'),
    historyDelete
  );
  console.warn('  - history DELETE (単一):', {
    status: historyDeleteRes.status,
    body: historyDeleteRes.body,
  });

  console.warn('\n[3] レート制限 429 再現');
  process.env.RATE_LIMIT_SUGGEST_PER_MIN = '1';
  const ip429 = '192.168.0.10';
  const first = await runRequest(
    makeRequest('/api/users/suggest?q=テスト429', 'GET', undefined, ip429),
    suggestGet
  );
  const second = await runRequest(
    makeRequest('/api/users/suggest?q=テスト429', 'GET', undefined, ip429),
    suggestGet
  );
  console.warn('  - first:', first.status, 'second:', second.status);

  console.warn('\n[4] レイテンシ分布（local engine）');
  process.env.RATE_LIMIT_SUGGEST_PER_MIN = '1000';
  process.env.RATE_LIMIT_SEARCH_PER_MIN = '1000';
  const suggestDurations: number[] = [];
  const searchDurations: number[] = [];
  for (let i = 0; i < 10; i++) {
    const ip = `10.0.0.${i + 1}`;
    const sug = await runRequest(
      makeRequest(`/api/users/suggest?q=やま${i}`, 'GET', undefined, ip),
      suggestGet
    );
    suggestDurations.push(sug.durationMs);
    const sea = await runRequest(
      makeRequest(`/api/users/search?q=やま${i}`, 'GET', undefined, `10.0.1.${i + 1}`),
      searchGet
    );
    searchDurations.push(sea.durationMs);
  }
  const suggestP95 = percentile(suggestDurations, 95);
  const searchP95 = percentile(searchDurations, 95);
  console.warn(
    '  - suggest durations (ms):',
    suggestDurations.map((v) => v.toFixed(1))
  );
  console.warn(
    '  - search durations  (ms):',
    searchDurations.map((v) => v.toFixed(1))
  );
  console.warn(
    '  - P95 => suggest:',
    suggestP95.toFixed(1),
    'ms, search:',
    searchP95.toFixed(1),
    'ms'
  );

  console.warn('\n[5] SEARCH_ENGINE=atlas フォールバック検証');
  process.env.SEARCH_ENGINE = 'atlas';
  process.env.SEARCH_ATLAS_FALLBACK_TO_LOCAL = '1';
  const atlasFallback = await runRequest(
    makeRequest('/api/users/search?q=atlas-fallback', 'GET', undefined, '172.16.0.1'),
    searchGet
  );
  console.warn(
    '  - atlas fallback ON status:',
    atlasFallback.status,
    'errorId:',
    atlasFallback.errorId
  );

  process.env.SEARCH_ATLAS_FALLBACK_TO_LOCAL = '0';
  const atlasStrict = await runRequest(
    makeRequest('/api/users/search?q=atlas-strict', 'GET', undefined, '172.16.0.2'),
    searchGet
  );
  console.warn(
    '  - atlas fallback OFF status:',
    atlasStrict.status,
    'errorId:',
    atlasStrict.errorId
  );

  console.warn('\n✅ Step02 API 検証スクリプト完了');
  await mongoose.disconnect();
  mutableJwt.getToken = originalGetToken;
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ 検証スクリプトで致命的エラー:', err);
  mutableJwt.getToken = originalGetToken;
  process.exit(1);
});
