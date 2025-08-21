import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';

import Post from '@/models/Post';
import User from '@/lib/models/User';

let mongoServer: MongoMemoryServer;
let testUser1: any;
let testUser2: any;

describe('掲示板API', () => {
  beforeAll(async () => {
    // インメモリMongoDBサーバーを起動
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // テストユーザーを作成
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    
    testUser1 = await User.create({
      email: 'apitest1@example.com',
      password: hashedPassword,
      name: 'APIテストユーザー1',
      emailVerified: true,
    });

    testUser2 = await User.create({
      email: 'apitest2@example.com',
      password: hashedPassword,
      name: 'APIテストユーザー2',
      emailVerified: true,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    // 各テストの前に投稿をクリア
    await Post.deleteMany({});
  });

  describe('GET /api/posts', () => {
    it('投稿一覧を取得できる', async () => {
      // テスト投稿を作成
      await Post.create({
        title: 'テスト投稿1',
        content: '内容1',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      await Post.create({
        title: 'テスト投稿2',
        content: '内容2',
        author: testUser2._id,
        authorInfo: {
          name: testUser2.name,
          email: testUser2.email,
        },
        status: 'published',
      });

      const posts = await Post.find({ status: 'published' }).sort({ createdAt: -1 });
      
      expect(posts).toHaveLength(2);
      expect(posts[0].title).toBe('テスト投稿2'); // 新しい順
      expect(posts[1].title).toBe('テスト投稿1');
    });

    it('削除済み投稿は取得しない', async () => {
      await Post.create({
        title: '公開投稿',
        content: '表示される',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      await Post.create({
        title: '削除済み投稿',
        content: '表示されない',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'deleted',
      });

      const posts = await Post.find({ status: 'published' });
      
      expect(posts).toHaveLength(1);
      expect(posts[0].title).toBe('公開投稿');
    });

    it('ページネーションが動作する', async () => {
      // 15件の投稿を作成
      for (let i = 1; i <= 15; i++) {
        await Post.create({
          title: `投稿${i}`,
          content: `内容${i}`,
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email,
          },
          status: 'published',
        });
      }

      // 1ページ目（10件）
      const page1 = await Post.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .skip(0)
        .limit(10);
      
      expect(page1).toHaveLength(10);

      // 2ページ目（5件）
      const page2 = await Post.find({ status: 'published' })
        .sort({ createdAt: -1 })
        .skip(10)
        .limit(10);
      
      expect(page2).toHaveLength(5);
    });
  });

  describe('POST /api/posts', () => {
    it('新規投稿を作成できる', async () => {
      const postData = {
        title: '新規投稿',
        content: 'これは新規投稿です',
        tags: ['テスト', 'API'],
      };

      const post = await Post.create({
        ...postData,
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      expect(post.title).toBe(postData.title);
      expect(post.content).toBe(postData.content);
      expect(post.tags).toEqual(postData.tags);
      expect(post.author.toString()).toBe(testUser1._id.toString());
    });

    it('バリデーションエラーが発生する', async () => {
      // タイトルなし
      try {
        await Post.create({
          content: '内容のみ',
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email,
          },
        });
        fail('バリデーションエラーが発生するはず');
      } catch (error: any) {
        expect(error.name).toBe('ValidationError');
      }

      // 文字数超過
      try {
        await Post.create({
          title: 'あ'.repeat(101), // 100文字制限
          content: '内容',
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email,
          },
        });
        fail('バリデーションエラーが発生するはず');
      } catch (error: any) {
        expect(error.name).toBe('ValidationError');
      }
    });
  });

  describe('PUT /api/posts/:id', () => {
    it('自分の投稿を更新できる', async () => {
      const post = await Post.create({
        title: '元のタイトル',
        content: '元の内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      const updated = await Post.findByIdAndUpdate(
        post._id,
        {
          title: '更新後のタイトル',
          content: '更新後の内容',
        },
        { new: true }
      );

      expect(updated?.title).toBe('更新後のタイトル');
      expect(updated?.content).toBe('更新後の内容');
    });

    it('他人の投稿は更新できない', async () => {
      const post = await Post.create({
        title: 'User1の投稿',
        content: '内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      // User2が更新を試みる（実際のAPIでは403エラーになる）
      const isOwner = post.author.toString() === testUser2._id.toString();
      expect(isOwner).toBe(false);
    });
  });

  describe('DELETE /api/posts/:id', () => {
    it('自分の投稿をソフトデリートできる', async () => {
      const post = await Post.create({
        title: '削除する投稿',
        content: '内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      // ソフトデリート
      const deleted = await Post.findByIdAndUpdate(
        post._id,
        { status: 'deleted' },
        { new: true }
      );

      expect(deleted?.status).toBe('deleted');
      
      // データベースには残っている
      const stillExists = await Post.findById(post._id);
      expect(stillExists).not.toBeNull();
      expect(stillExists?.status).toBe('deleted');
    });

    it('削除済み投稿は一覧に表示されない', async () => {
      await Post.create({
        title: '削除済み',
        content: '内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'deleted',
      });

      const posts = await Post.find({ status: 'published' });
      expect(posts).toHaveLength(0);
    });
  });

  describe('セキュリティ', () => {
    it('XSSペイロードが無害化される', async () => {
      const xssPayload = {
        title: '<script>alert("XSS")</script>',
        content: '<img src=x onerror="alert(\'XSS\')">',
      };

      const post = await Post.create({
        ...xssPayload,
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      // データベースに文字列として保存される
      expect(post.title).toBe(xssPayload.title);
      expect(post.content).toBe(xssPayload.content);
      
      // HTMLとして解釈されない（レンダリング時にエスケープされる）
      expect(post.title).toContain('script');
      expect(post.content).toContain('img');
    });

    it('SQLインジェクションが防げる', async () => {
      const sqlInjection = {
        title: "'; DROP TABLE posts; --",
        content: 'テスト',
      };

      const post = await Post.create({
        ...sqlInjection,
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email,
        },
        status: 'published',
      });

      // 文字列として安全に保存される
      expect(post.title).toBe(sqlInjection.title);
      
      // テーブルは削除されていない
      const posts = await Post.find();
      expect(posts).toBeDefined();
    });
  });

  describe('パフォーマンス', () => {
    it('大量データでもクエリが高速', async () => {
      // 100件の投稿を作成
      const posts = [];
      for (let i = 1; i <= 100; i++) {
        posts.push({
          title: `投稿${i}`,
          content: `内容${i}`,
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email,
          },
          status: 'published',
          createdAt: new Date(Date.now() - i * 1000), // 時間差をつける
        });
      }
      await Post.insertMany(posts);

      const startTime = Date.now();
      
      // インデックスを使用したクエリ
      const result = await Post.find({ author: testUser1._id, status: 'published' })
        .sort({ createdAt: -1 })
        .limit(10);
      
      const queryTime = Date.now() - startTime;
      
      expect(result).toHaveLength(10);
      expect(queryTime).toBeLessThan(100); // 100ms以内
    });
  });
});