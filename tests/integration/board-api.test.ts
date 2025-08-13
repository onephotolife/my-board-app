import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import bcrypt from 'bcryptjs';
import { GET, POST } from '@/app/api/posts/route';
import { PUT, DELETE } from '@/app/api/posts/[id]/route';
import Post from '@/models/Post';
import User from '@/lib/models/User';
import { auth } from '@/lib/auth';

/**
 * 掲示板API結合テスト
 * 
 * テスト対象:
 * - API エンドポイントの統合動作
 * - 認証・認可フロー
 * - データベースとの連携
 * - エラーハンドリング
 */

// auth関数をモック
jest.mock('@/lib/auth', () => ({
  auth: jest.fn()
}));

describe('Board API - Integration Tests', () => {
  let mongoServer: MongoMemoryServer;
  let testUser1: any;
  let testUser2: any;
  let mockAuth: jest.MockedFunction<typeof auth>;

  beforeAll(async () => {
    // インメモリMongoDBの起動
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);

    // テストユーザーの作成
    const hashedPassword = await bcrypt.hash('Test1234!', 10);
    
    testUser1 = await User.create({
      email: 'integration1@example.com',
      password: hashedPassword,
      name: '統合テストユーザー1',
      emailVerified: true
    });

    testUser2 = await User.create({
      email: 'integration2@example.com',
      password: hashedPassword,
      name: '統合テストユーザー2',
      emailVerified: true
    });

    mockAuth = auth as jest.MockedFunction<typeof auth>;
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Post.deleteMany({});
    jest.clearAllMocks();
  });

  describe('GET /api/posts', () => {
    it('投稿一覧を取得できる', async () => {
      // テストデータの準備
      await Post.create([
        {
          title: '投稿1',
          content: '内容1',
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email
          },
          status: 'published'
        },
        {
          title: '投稿2',
          content: '内容2',
          author: testUser2._id,
          authorInfo: {
            name: testUser2.name,
            email: testUser2.email
          },
          status: 'published'
        }
      ]);

      // 認証状態をモック
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email,
          name: testUser1.name
        }
      } as any);

      // リクエストの作成
      const request = new NextRequest('http://localhost:3000/api/posts');
      
      // APIの実行
      const response = await GET(request);
      const data = await response.json();

      // 検証
      expect(response.status).toBe(200);
      expect(data.posts).toHaveLength(2);
      expect(data.posts[0].canEdit).toBe(true); // user1の投稿
      expect(data.posts[1].canEdit).toBe(false); // user2の投稿
      expect(data.pagination).toBeDefined();
      expect(data.isAuthenticated).toBe(true);
    });

    it('ページネーションが動作する', async () => {
      // 15件の投稿を作成
      const posts = [];
      for (let i = 1; i <= 15; i++) {
        posts.push({
          title: `投稿${i}`,
          content: `内容${i}`,
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email
          },
          status: 'published'
        });
      }
      await Post.create(posts);

      // 1ページ目
      const request1 = new NextRequest('http://localhost:3000/api/posts?page=1&limit=10');
      const response1 = await GET(request1);
      const data1 = await response1.json();

      expect(data1.posts).toHaveLength(10);
      expect(data1.pagination.page).toBe(1);
      expect(data1.pagination.totalPages).toBe(2);

      // 2ページ目
      const request2 = new NextRequest('http://localhost:3000/api/posts?page=2&limit=10');
      const response2 = await GET(request2);
      const data2 = await response2.json();

      expect(data2.posts).toHaveLength(5);
      expect(data2.pagination.page).toBe(2);
    });

    it('削除済み投稿は表示されない', async () => {
      await Post.create([
        {
          title: '公開投稿',
          content: '内容',
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email
          },
          status: 'published'
        },
        {
          title: '削除済み投稿',
          content: '内容',
          author: testUser1._id,
          authorInfo: {
            name: testUser1.name,
            email: testUser1.email
          },
          status: 'deleted'
        }
      ]);

      const request = new NextRequest('http://localhost:3000/api/posts');
      const response = await GET(request);
      const data = await response.json();

      expect(data.posts).toHaveLength(1);
      expect(data.posts[0].title).toBe('公開投稿');
    });
  });

  describe('POST /api/posts', () => {
    it('認証済みユーザーは投稿を作成できる', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email,
          name: testUser1.name
        }
      } as any);

      const postData = {
        title: '新規投稿',
        content: 'これは新規投稿です',
        tags: ['テスト', 'API']
      };

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify(postData)
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.message).toBe('投稿を作成しました');
      expect(data.post.title).toBe(postData.title);
      expect(data.post.content).toBe(postData.content);
      expect(data.post.authorInfo.name).toBe(testUser1.name);
      expect(data.post.status).toBe('published');
    });

    it('未認証ユーザーは投稿を作成できない', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: '投稿',
          content: '内容'
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('ログインが必要です');
    });

    it('バリデーションエラーが正しく処理される', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email
        }
      } as any);

      const request = new NextRequest('http://localhost:3000/api/posts', {
        method: 'POST',
        body: JSON.stringify({
          title: '', // 空のタイトル
          content: 'あ'.repeat(1001) // 1000文字を超える
        })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toBe('バリデーションエラー');
      expect(data.details).toBeDefined();
    });
  });

  describe('PUT /api/posts/:id', () => {
    let testPost: any;

    beforeEach(async () => {
      testPost = await Post.create({
        title: '元のタイトル',
        content: '元の内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email
        },
        status: 'published'
      });
    });

    it('投稿の作成者は編集できる', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email
        }
      } as any);

      const updateData = {
        title: '更新後のタイトル',
        content: '更新後の内容'
      };

      const request = new NextRequest(`http://localhost:3000/api/posts/${testPost._id}`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      const response = await PUT(request, { params: Promise.resolve({ id: testPost._id.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('投稿を更新しました');
      expect(data.post.title).toBe(updateData.title);
      expect(data.post.content).toBe(updateData.content);
    });

    it('他のユーザーの投稿は編集できない', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser2._id.toString(), // 別のユーザー
          email: testUser2.email
        }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/posts/${testPost._id}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: '不正な更新'
        })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: testPost._id.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('編集権限がありません');
    });

    it('存在しない投稿は編集できない', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email
        }
      } as any);

      const fakeId = new mongoose.Types.ObjectId();
      const request = new NextRequest(`http://localhost:3000/api/posts/${fakeId}`, {
        method: 'PUT',
        body: JSON.stringify({
          title: '更新'
        })
      });

      const response = await PUT(request, { params: Promise.resolve({ id: fakeId.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.error).toBe('投稿が見つかりません');
    });
  });

  describe('DELETE /api/posts/:id', () => {
    let testPost: any;

    beforeEach(async () => {
      testPost = await Post.create({
        title: '削除対象',
        content: '内容',
        author: testUser1._id,
        authorInfo: {
          name: testUser1.name,
          email: testUser1.email
        },
        status: 'published'
      });
    });

    it('投稿の作成者は削除できる（ソフトデリート）', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser1._id.toString(),
          email: testUser1.email
        }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/posts/${testPost._id}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testPost._id.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.message).toBe('投稿を削除しました');

      // データベースで確認
      const deletedPost = await Post.findById(testPost._id);
      expect(deletedPost?.status).toBe('deleted');
    });

    it('他のユーザーの投稿は削除できない', async () => {
      mockAuth.mockResolvedValue({
        user: {
          id: testUser2._id.toString(), // 別のユーザー
          email: testUser2.email
        }
      } as any);

      const request = new NextRequest(`http://localhost:3000/api/posts/${testPost._id}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testPost._id.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(403);
      expect(data.error).toBe('削除権限がありません');

      // 投稿がまだ存在することを確認
      const post = await Post.findById(testPost._id);
      expect(post?.status).toBe('published');
    });

    it('未認証ユーザーは削除できない', async () => {
      mockAuth.mockResolvedValue(null);

      const request = new NextRequest(`http://localhost:3000/api/posts/${testPost._id}`, {
        method: 'DELETE'
      });

      const response = await DELETE(request, { params: Promise.resolve({ id: testPost._id.toString() }) });
      const data = await response.json();

      expect(response.status).toBe(401);
      expect(data.error).toBe('ログインが必要です');
    });
  });

  describe('フィルタリングとソート', () => {
    beforeEach(async () => {
      await Post.create([
        {
          title: 'User1の投稿1',
          content: '内容',
          author: testUser1._id,
          authorInfo: { name: testUser1.name, email: testUser1.email },
          status: 'published',
          createdAt: new Date('2024-01-01')
        },
        {
          title: 'User1の投稿2',
          content: '内容',
          author: testUser1._id,
          authorInfo: { name: testUser1.name, email: testUser1.email },
          status: 'published',
          createdAt: new Date('2024-01-03')
        },
        {
          title: 'User2の投稿',
          content: '内容',
          author: testUser2._id,
          authorInfo: { name: testUser2.name, email: testUser2.email },
          status: 'published',
          createdAt: new Date('2024-01-02')
        }
      ]);
    });

    it('作者でフィルタリングできる', async () => {
      const request = new NextRequest(`http://localhost:3000/api/posts?author=${testUser1._id}`);
      const response = await GET(request);
      const data = await response.json();

      expect(data.posts).toHaveLength(2);
      expect(data.posts.every((p: any) => p.author === testUser1._id.toString())).toBe(true);
    });

    it('作成日時でソートできる', async () => {
      const request = new NextRequest('http://localhost:3000/api/posts?sort=-createdAt');
      const response = await GET(request);
      const data = await response.json();

      expect(data.posts[0].title).toBe('User1の投稿2'); // 最新
      expect(data.posts[1].title).toBe('User2の投稿');
      expect(data.posts[2].title).toBe('User1の投稿1'); // 最古
    });
  });
});