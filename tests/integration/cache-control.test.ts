import { createClient } from 'redis';
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
    const cacheKey = `post:${postId}`;
    
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
      `post:${postId}`,
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
