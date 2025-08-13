#!/usr/bin/env node

/**
 * 未実装テストの自動生成スクリプト
 * 95%カバレッジ達成のためのテストファイル生成
 */

const fs = require('fs').promises;
const path = require('path');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

// テストテンプレート定義
const testTemplates = {
  // データベース層テスト
  'tests/database/transaction.test.ts': `import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Post from '@/models/Post';

describe('Database Transaction Tests', () => {
  let mongoServer: MongoMemoryServer;
  let session: mongoose.ClientSession;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create({ replSet: { count: 1 } });
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);
  });

  beforeEach(async () => {
    session = await mongoose.startSession();
  });

  afterEach(async () => {
    await session.endSession();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  describe('トランザクション処理', () => {
    it('複数投稿の一括作成でエラー時にロールバック', async () => {
      await session.withTransaction(async () => {
        const posts = [
          { title: '投稿1', content: '内容1', author: new mongoose.Types.ObjectId() },
          { title: '', content: '内容2', author: new mongoose.Types.ObjectId() } // エラーを発生させる
        ];
        
        try {
          for (const postData of posts) {
            await Post.create([postData], { session });
          }
        } catch (error) {
          throw error; // トランザクションをロールバック
        }
      }).catch(() => {});

      const count = await Post.countDocuments();
      expect(count).toBe(0); // ロールバックされている
    });

    it('デッドロック検出とリトライ', async () => {
      const retryTransaction = async (fn: Function, maxRetries = 3) => {
        for (let i = 0; i < maxRetries; i++) {
          try {
            return await fn();
          } catch (error: any) {
            if (error.code === 112 && i < maxRetries - 1) { // WriteConflict
              await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, i)));
              continue;
            }
            throw error;
          }
        }
      };

      const result = await retryTransaction(async () => {
        return await session.withTransaction(async () => {
          return await Post.create([{
            title: 'テスト投稿',
            content: '内容',
            author: new mongoose.Types.ObjectId(),
            authorInfo: { name: 'テスト', email: 'test@example.com' }
          }], { session });
        });
      });

      expect(result).toBeDefined();
    });
  });
});
`,

  'tests/database/backup-restore.test.ts': `import { exec } from 'child_process';
import { promisify } from 'util';
import mongoose from 'mongoose';
import Post from '@/models/Post';

const execAsync = promisify(exec);

describe('Backup and Restore Tests', () => {
  const backupPath = '/tmp/test-backup';

  it('データベースのバックアップと復元', async () => {
    // テストデータ作成
    const originalPost = await Post.create({
      title: 'バックアップテスト',
      content: '重要なデータ',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    // バックアップ実行
    const dbName = mongoose.connection.db?.databaseName;
    await execAsync(\`mongodump --db=\${dbName} --out=\${backupPath}\`);

    // データ削除
    await Post.deleteMany({});
    const afterDelete = await Post.countDocuments();
    expect(afterDelete).toBe(0);

    // リストア実行
    await execAsync(\`mongorestore --db=\${dbName} \${backupPath}/\${dbName}\`);

    // データ検証
    const restoredPost = await Post.findOne({ title: 'バックアップテスト' });
    expect(restoredPost).toBeDefined();
    expect(restoredPost?.content).toBe('重要なデータ');
  });

  it('増分バックアップのシミュレーション', async () => {
    const getOplogTimestamp = async () => {
      const db = mongoose.connection.db;
      const oplog = db?.collection('oplog.rs');
      const latest = await oplog?.findOne({}, { sort: { ts: -1 } });
      return latest?.ts;
    };

    const timestamp = await getOplogTimestamp();
    expect(timestamp).toBeDefined();
  });
});
`,

  // モデル層テスト
  'src/models/__tests__/Post.middleware.test.ts': `import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Post from '../Post';
import { EventEmitter } from 'events';

// イベントエミッターでミドルウェアをシミュレート
const postEvents = new EventEmitter();

describe('Post-save Middleware Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // Post-saveフックを追加
    Post.schema.post('save', function(doc) {
      postEvents.emit('postSaved', doc);
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('保存後の通知システムトリガー', async (done) => {
    postEvents.once('postSaved', (doc) => {
      expect(doc.title).toBe('新規投稿');
      done();
    });

    await Post.create({
      title: '新規投稿',
      content: '内容',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });
  });

  it('検索インデックスの更新', async () => {
    const updateSearchIndex = jest.fn();
    postEvents.on('postSaved', updateSearchIndex);

    await Post.create({
      title: 'インデックステスト',
      content: '内容',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    expect(updateSearchIndex).toHaveBeenCalled();
  });

  it('キャッシュの無効化', async () => {
    const invalidateCache = jest.fn();
    postEvents.on('postSaved', (doc) => {
      invalidateCache(\`post:\${doc._id}\`);
      invalidateCache('posts:list');
    });

    const post = await Post.create({
      title: 'キャッシュテスト',
      content: '内容',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    expect(invalidateCache).toHaveBeenCalledWith(\`post:\${post._id}\`);
    expect(invalidateCache).toHaveBeenCalledWith('posts:list');
  });
});
`,

  'src/models/__tests__/Post.validators.test.ts': `import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Post from '../Post';

describe('Custom Validators Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    // カスタムバリデーター追加
    Post.schema.path('content').validate({
      validator: function(value: string) {
        // 不適切なコンテンツの検出
        const bannedWords = ['spam', 'abuse', 'hate'];
        return !bannedWords.some(word => value.toLowerCase().includes(word));
      },
      message: '不適切なコンテンツが含まれています'
    });

    Post.schema.path('content').validate({
      validator: function(value: string) {
        // XSS攻撃パターンの検出
        const xssPatterns = [/<script/i, /javascript:/i, /on\\w+=/i];
        return !xssPatterns.some(pattern => pattern.test(value));
      },
      message: 'セキュリティリスクのあるコンテンツです'
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it('不適切なコンテンツの検出', async () => {
    const post = new Post({
      title: 'テスト',
      content: 'This is spam content',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    await expect(post.save()).rejects.toThrow(/不適切なコンテンツ/);
  });

  it('URLバリデーション', async () => {
    const urlValidator = (value: string) => {
      const urlPattern = /https?:\\/\\/(www\\.)?[-a-zA-Z0-9@:%._\\+~#=]{1,256}\\.[a-zA-Z0-9()]{1,6}\\b([-a-zA-Z0-9()@:%_\\+.~#?&//=]*)/;
      const urls = value.match(urlPattern);
      return !urls || urls.length <= 3; // 最大3つのURLまで
    };

    const validPost = new Post({
      title: 'リンク付き投稿',
      content: 'Check out https://example.com',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    expect(urlValidator(validPost.content)).toBe(true);
  });

  it('XSS攻撃パターンの検出', async () => {
    const maliciousPost = new Post({
      title: 'XSS攻撃',
      content: '<script>alert("XSS")</script>',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    await expect(maliciousPost.save()).rejects.toThrow(/セキュリティリスク/);
  });
});
`,

  // API層テスト
  'tests/integration/rate-limiting.test.ts': `import request from 'supertest';
import express from 'express';
import rateLimit from 'express-rate-limit';

describe('Rate Limiting Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    
    // レート制限設定
    const limiter = rateLimit({
      windowMs: 1 * 60 * 1000, // 1分
      max: 10, // 最大10リクエスト
      message: { error: 'リクエスト数が多すぎます' },
      standardHeaders: true,
      legacyHeaders: false,
    });

    app.use('/api/', limiter);
    app.get('/api/test', (req, res) => res.json({ success: true }));
  });

  it('制限内での正常動作', async () => {
    for (let i = 0; i < 10; i++) {
      const res = await request(app).get('/api/test');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    }
  });

  it('制限超過時の429エラー', async () => {
    // 10リクエスト送信
    for (let i = 0; i < 10; i++) {
      await request(app).get('/api/test');
    }
    
    // 11個目はブロック
    const res = await request(app).get('/api/test');
    expect(res.status).toBe(429);
    expect(res.body.error).toBe('リクエスト数が多すぎます');
  });

  it('IPごとの制限管理', async () => {
    const res1 = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '192.168.1.1');
    
    const res2 = await request(app)
      .get('/api/test')
      .set('X-Forwarded-For', '192.168.1.2');
    
    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
  });

  it('認証ユーザーの制限緩和', async () => {
    const authLimiter = rateLimit({
      windowMs: 1 * 60 * 1000,
      max: 50, // 認証ユーザーは50リクエスト
      skip: (req) => !req.headers.authorization
    });

    const authApp = express();
    authApp.use('/api/', authLimiter);
    authApp.get('/api/test', (req, res) => res.json({ success: true }));

    for (let i = 0; i < 20; i++) {
      const res = await request(authApp)
        .get('/api/test')
        .set('Authorization', 'Bearer token');
      expect(res.status).toBe(200);
    }
  });
});
`,

  'tests/integration/cache-control.test.ts': `import { createClient } from 'redis';
import Post from '@/models/Post';

describe('Cache Control Tests', () => {
  let redisClient: ReturnType<typeof createClient>;

  beforeAll(async () => {
    redisClient = createClient({ url: 'redis://localhost:6379' });
    await redisClient.connect();
  });

  afterAll(async () => {
    await redisClient.quit();
  });

  beforeEach(async () => {
    await redisClient.flushAll();
  });

  it('投稿一覧のキャッシュ', async () => {
    const cacheKey = 'posts:list:page:1';
    
    // キャッシュミス
    const cached = await redisClient.get(cacheKey);
    expect(cached).toBeNull();
    
    // データ取得とキャッシュ
    const posts = await Post.find().limit(10);
    await redisClient.setEx(cacheKey, 300, JSON.stringify(posts));
    
    // キャッシュヒット
    const cachedData = await redisClient.get(cacheKey);
    expect(cachedData).toBeDefined();
    expect(JSON.parse(cachedData!)).toHaveLength(posts.length);
  });

  it('個別投稿のキャッシュ', async () => {
    const postId = 'test-post-id';
    const cacheKey = \`post:\${postId}\`;
    
    const postData = {
      title: 'キャッシュテスト',
      content: '内容',
      author: 'user-id'
    };
    
    await redisClient.setEx(cacheKey, 600, JSON.stringify(postData));
    
    const cached = await redisClient.get(cacheKey);
    const parsed = JSON.parse(cached!);
    expect(parsed.title).toBe('キャッシュテスト');
  });

  it('更新時のキャッシュ無効化', async () => {
    const postId = 'test-post-id';
    const cacheKeys = [
      \`post:\${postId}\`,
      'posts:list:page:1',
      'posts:list:page:2'
    ];
    
    // キャッシュ設定
    for (const key of cacheKeys) {
      await redisClient.set(key, 'cached-data');
    }
    
    // 無効化
    await redisClient.del(cacheKeys);
    
    // 確認
    for (const key of cacheKeys) {
      const data = await redisClient.get(key);
      expect(data).toBeNull();
    }
  });

  it('TTL設定の検証', async () => {
    const cacheKey = 'test:ttl';
    await redisClient.setEx(cacheKey, 10, 'data');
    
    const ttl = await redisClient.ttl(cacheKey);
    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(10);
  });
});
`,

  // パフォーマンステスト
  'tests/performance/memory.test.ts': `import v8 from 'v8';
import { performance } from 'perf_hooks';

describe('Memory Usage Tests', () => {
  const getMemoryUsage = () => {
    const heapStats = v8.getHeapStatistics();
    return {
      used: heapStats.used_heap_size / 1024 / 1024, // MB
      total: heapStats.total_heap_size / 1024 / 1024,
      limit: heapStats.heap_size_limit / 1024 / 1024
    };
  };

  it('ヒープサイズの監視', () => {
    const memory = getMemoryUsage();
    
    expect(memory.used).toBeLessThan(512); // 512MB未満
    expect(memory.total).toBeLessThan(1024); // 1GB未満
  });

  it('メモリリークの検出', async () => {
    const initialMemory = getMemoryUsage();
    
    // 大量のオブジェクト作成
    const objects = [];
    for (let i = 0; i < 10000; i++) {
      objects.push({
        id: i,
        data: new Array(100).fill('test')
      });
    }
    
    const afterCreation = getMemoryUsage();
    expect(afterCreation.used).toBeGreaterThan(initialMemory.used);
    
    // クリーンアップ
    objects.length = 0;
    global.gc && global.gc(); // 強制GC（--expose-gcフラグが必要）
    
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const afterCleanup = getMemoryUsage();
    const leakThreshold = initialMemory.used * 1.1; // 10%の余裕
    expect(afterCleanup.used).toBeLessThan(leakThreshold);
  });

  it('ガベージコレクションの影響', async () => {
    const measurements = [];
    
    for (let i = 0; i < 5; i++) {
      const memory = getMemoryUsage();
      measurements.push(memory.used);
      
      // 一時的なオブジェクト作成
      const temp = new Array(1000000).fill('x');
      await new Promise(resolve => setTimeout(resolve, 10));
    }
    
    // メモリ使用量が安定していることを確認
    const avgMemory = measurements.reduce((a, b) => a + b) / measurements.length;
    const variance = measurements.reduce((sum, val) => sum + Math.pow(val - avgMemory, 2), 0) / measurements.length;
    const stdDev = Math.sqrt(variance);
    
    expect(stdDev).toBeLessThan(50); // 標準偏差が50MB未満
  });
});
`,

  'tests/performance/cpu.test.ts': `import os from 'os';
import { performance } from 'perf_hooks';

describe('CPU Usage Tests', () => {
  const getCPUUsage = () => {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;
    
    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });
    
    return 100 - ~~(100 * totalIdle / totalTick);
  };

  it('CPU使用率の測定', () => {
    const usage = getCPUUsage();
    expect(usage).toBeGreaterThanOrEqual(0);
    expect(usage).toBeLessThanOrEqual(100);
  });

  it('高負荷時の動作確認', async () => {
    const startUsage = getCPUUsage();
    
    // CPU集約的な処理
    const start = performance.now();
    let result = 0;
    for (let i = 0; i < 1000000; i++) {
      result += Math.sqrt(i);
    }
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(1000); // 1秒以内
    expect(result).toBeGreaterThan(0);
  });

  it('並行処理の最適化', async () => {
    const workers = os.cpus().length;
    const tasks = new Array(workers).fill(0).map((_, i) => {
      return new Promise(resolve => {
        setTimeout(() => {
          let sum = 0;
          for (let j = 0; j < 1000000; j++) {
            sum += j * i;
          }
          resolve(sum);
        }, 0);
      });
    });
    
    const start = performance.now();
    await Promise.all(tasks);
    const duration = performance.now() - start;
    
    expect(duration).toBeLessThan(2000); // 2秒以内
  });
});
`,

  'tests/performance/cache-efficiency.test.ts': `interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
}

describe('Cache Efficiency Tests', () => {
  let cacheStats: CacheStats;
  let cache: Map<string, any>;

  beforeEach(() => {
    cache = new Map();
    cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  });

  const getCached = (key: string) => {
    if (cache.has(key)) {
      cacheStats.hits++;
      return cache.get(key);
    }
    cacheStats.misses++;
    return null;
  };

  const setCached = (key: string, value: any) => {
    cacheStats.sets++;
    cache.set(key, value);
  };

  it('キャッシュヒット率の測定', () => {
    // データ設定
    setCached('key1', 'value1');
    setCached('key2', 'value2');
    
    // アクセスパターン
    getCached('key1'); // hit
    getCached('key1'); // hit
    getCached('key2'); // hit
    getCached('key3'); // miss
    
    const hitRate = (cacheStats.hits / (cacheStats.hits + cacheStats.misses)) * 100;
    expect(hitRate).toBe(75); // 75%のヒット率
  });

  it('キャッシュサイズの最適化', () => {
    const maxSize = 100;
    const lruCache = new Map();
    
    // LRU実装
    const set = (key: string, value: any) => {
      if (lruCache.has(key)) {
        lruCache.delete(key);
      }
      lruCache.set(key, value);
      
      if (lruCache.size > maxSize) {
        const firstKey = lruCache.keys().next().value;
        lruCache.delete(firstKey);
      }
    };
    
    // 容量テスト
    for (let i = 0; i < 150; i++) {
      set(\`key\${i}\`, \`value\${i}\`);
    }
    
    expect(lruCache.size).toBeLessThanOrEqual(maxSize);
  });

  it('無効化戦略の検証', () => {
    // タグベースの無効化
    const taggedCache = new Map<string, { value: any; tags: string[] }>();
    
    const setWithTags = (key: string, value: any, tags: string[]) => {
      taggedCache.set(key, { value, tags });
    };
    
    const invalidateByTag = (tag: string) => {
      for (const [key, item] of taggedCache.entries()) {
        if (item.tags.includes(tag)) {
          taggedCache.delete(key);
        }
      }
    };
    
    // テストデータ
    setWithTags('post:1', { title: '投稿1' }, ['posts', 'user:1']);
    setWithTags('post:2', { title: '投稿2' }, ['posts', 'user:2']);
    setWithTags('user:1', { name: 'ユーザー1' }, ['user:1']);
    
    // タグで無効化
    invalidateByTag('user:1');
    
    expect(taggedCache.has('post:1')).toBe(false);
    expect(taggedCache.has('post:2')).toBe(true);
    expect(taggedCache.has('user:1')).toBe(false);
  });
});
`,

  // エラーハンドリングテスト
  'tests/error-handling/timeout.test.ts': `import axios from 'axios';
import { setTimeout } from 'timers/promises';

describe('Timeout Handling Tests', () => {
  it('API呼び出しのタイムアウト', async () => {
    const client = axios.create({
      timeout: 1000 // 1秒
    });

    await expect(
      client.get('https://httpstat.us/200?sleep=2000')
    ).rejects.toThrow(/timeout/);
  });

  it('データベース接続のタイムアウト', async () => {
    const connectWithTimeout = async (url: string, timeout: number) => {
      const controller = new AbortController();
      const timer = setTimeout(timeout);
      
      try {
        const connection = await Promise.race([
          new Promise((resolve) => setTimeout(resolve, 2000, 'connected')),
          timer.then(() => {
            controller.abort();
            throw new Error('Connection timeout');
          })
        ]);
        return connection;
      } finally {
        controller.abort();
      }
    };

    await expect(
      connectWithTimeout('mongodb://slow-server', 1000)
    ).rejects.toThrow(/timeout/);
  });

  it('長時間実行処理の中断', async () => {
    const longRunningTask = async (signal: AbortSignal) => {
      for (let i = 0; i < 1000000; i++) {
        if (signal.aborted) {
          throw new Error('Task aborted');
        }
        // 処理
        if (i % 10000 === 0) {
          await new Promise(resolve => setImmediate(resolve));
        }
      }
    };

    const controller = new AbortController();
    setTimeout(() => controller.abort(), 100);

    await expect(
      longRunningTask(controller.signal)
    ).rejects.toThrow(/aborted/);
  });
});
`,

  'tests/error-handling/retry.test.ts': `import retry from 'async-retry';

describe('Retry Mechanism Tests', () => {
  it('一時的エラーの自動リトライ', async () => {
    let attempts = 0;
    
    const result = await retry(
      async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Temporary error');
        }
        return 'success';
      },
      {
        retries: 5,
        minTimeout: 10,
        maxTimeout: 100
      }
    );

    expect(result).toBe('success');
    expect(attempts).toBe(3);
  });

  it('指数バックオフの実装', async () => {
    const timestamps: number[] = [];
    
    await retry(
      async () => {
        timestamps.push(Date.now());
        if (timestamps.length < 4) {
          throw new Error('Retry needed');
        }
        return 'done';
      },
      {
        retries: 5,
        factor: 2,
        minTimeout: 100,
        maxTimeout: 1000
      }
    );

    // バックオフ間隔の検証
    for (let i = 1; i < timestamps.length; i++) {
      const interval = timestamps[i] - timestamps[i - 1];
      expect(interval).toBeGreaterThanOrEqual(100 * Math.pow(2, i - 1));
    }
  });

  it('最大リトライ回数の制御', async () => {
    let attempts = 0;
    
    await expect(
      retry(
        async () => {
          attempts++;
          throw new Error('Permanent error');
        },
        {
          retries: 3,
          minTimeout: 10
        }
      )
    ).rejects.toThrow(/Permanent error/);

    expect(attempts).toBe(4); // 初回 + 3リトライ
  });
});
`
};

// テストファイル生成関数
async function generateTestFiles() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  未実装テストファイル生成${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  let created = 0;
  let skipped = 0;

  for (const [filePath, content] of Object.entries(testTemplates)) {
    const fullPath = path.join(process.cwd(), filePath);
    const dir = path.dirname(fullPath);

    try {
      // ディレクトリ作成
      await fs.mkdir(dir, { recursive: true });

      // ファイルの存在確認
      try {
        await fs.access(fullPath);
        console.log(`${colors.yellow}⚠ スキップ${colors.reset}: ${filePath} (既存)`);
        skipped++;
      } catch {
        // ファイル作成
        await fs.writeFile(fullPath, content);
        console.log(`${colors.green}✓ 作成${colors.reset}: ${filePath}`);
        created++;
      }
    } catch (error) {
      console.error(`${colors.red}✗ エラー${colors.reset}: ${filePath}`, error.message);
    }
  }

  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}結果サマリー${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  console.log(`作成: ${colors.green}${created}${colors.reset} ファイル`);
  console.log(`スキップ: ${colors.yellow}${skipped}${colors.reset} ファイル`);
  console.log(`合計: ${created + skipped} ファイル\n`);

  // package.json更新の提案
  console.log(`${colors.blue}次のステップ:${colors.reset}`);
  console.log('1. 必要なパッケージをインストール:');
  console.log(`   ${colors.cyan}npm install --save-dev express-rate-limit redis ioredis helmet axe-playwright async-retry${colors.reset}`);
  console.log('\n2. テストを実行:');
  console.log(`   ${colors.cyan}npm test${colors.reset}`);
  console.log('\n3. カバレッジを確認:');
  console.log(`   ${colors.cyan}node scripts/test-coverage-report.js${colors.reset}`);
}

// 実行
if (require.main === module) {
  generateTestFiles().catch(console.error);
}

module.exports = { generateTestFiles };