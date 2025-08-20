import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import Post from '../Post';
import { faker } from '@faker-js/faker/locale/ja';

/**
 * Postモデル単体テスト
 * 
 * テスト対象:
 * - スキーマバリデーション
 * - デフォルト値
 * - インスタンスメソッド
 * - 静的メソッド
 * - ミドルウェア
 */

describe('Post Model - Unit Tests', () => {
  let mongoServer: MongoMemoryServer;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();
    await mongoose.connect(mongoUri);
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  afterEach(async () => {
    await Post.deleteMany({});
  });

  describe('スキーマバリデーション', () => {
    it('有効なデータで投稿を作成できる', async () => {
      const validData = {
        title: faker.lorem.sentence(5),
        content: faker.lorem.paragraph(3),
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: faker.person.fullName(),
          email: faker.internet.email(),
          avatar: faker.image.avatar()
        },
        status: 'published',
        tags: [faker.word.noun(), faker.word.noun()],
        likes: []
      };

      const post = new Post(validData);
      const savedPost = await post.save();

      expect(savedPost._id).toBeDefined();
      expect(savedPost.title).toBe(validData.title);
      expect(savedPost.content).toBe(validData.content);
      expect(savedPost.status).toBe('published');
      expect(savedPost.createdAt).toBeDefined();
      expect(savedPost.updatedAt).toBeDefined();
    });

    it('必須フィールドがない場合はエラーになる', async () => {
      const post = new Post({});

      await expect(post.save()).rejects.toThrow(mongoose.Error.ValidationError);
    });

    it('タイトルが100文字を超える場合はエラーになる', async () => {
      const post = new Post({
        title: 'あ'.repeat(101),
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await expect(post.save()).rejects.toThrow(/タイトルは100文字以内/);
    });

    it('本文が1000文字を超える場合はエラーになる', async () => {
      const post = new Post({
        title: 'タイトル',
        content: 'あ'.repeat(1001),
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await expect(post.save()).rejects.toThrow(/本文は1000文字以内/);
    });

    it('無効なstatusの場合はエラーになる', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        },
        status: 'invalid_status'
      });

      await expect(post.save()).rejects.toThrow(/ステータスは published, draft, deleted のいずれか/);
    });
  });

  describe('デフォルト値', () => {
    it('statusのデフォルト値はpublishedである', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await post.save();
      expect(post.status).toBe('published');
    });

    it('likesのデフォルト値は空配列である', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await post.save();
      expect(post.likes).toEqual([]);
    });

    it('avatarのデフォルト値はnullである', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await post.save();
      expect(post.authorInfo.avatar).toBeNull();
    });
  });

  describe('仮想プロパティ', () => {
    it('likeCountが正しく計算される', async () => {
      const userId1 = new mongoose.Types.ObjectId();
      const userId2 = new mongoose.Types.ObjectId();

      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        },
        likes: [userId1, userId2]
      });

      await post.save();
      expect(post.likeCount).toBe(2);
    });

    it('likesが空の場合likeCountは0になる', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        }
      });

      await post.save();
      expect(post.likeCount).toBe(0);
    });
  });

  describe('インスタンスメソッド', () => {
    describe('isOwner', () => {
      it('投稿者本人の場合trueを返す', async () => {
        const authorId = new mongoose.Types.ObjectId();
        
        const post = new Post({
          title: 'タイトル',
          content: '内容',
          author: authorId,
          authorInfo: {
            name: 'テストユーザー',
            email: 'test@example.com'
          }
        });

        await post.save();
        expect(post.isOwner(authorId)).toBe(true);
        expect(post.isOwner(authorId.toString())).toBe(true);
      });

      it('投稿者以外の場合falseを返す', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const otherId = new mongoose.Types.ObjectId();
        
        const post = new Post({
          title: 'タイトル',
          content: '内容',
          author: authorId,
          authorInfo: {
            name: 'テストユーザー',
            email: 'test@example.com'
          }
        });

        await post.save();
        expect(post.isOwner(otherId)).toBe(false);
      });
    });

    describe('toggleLike', () => {
      it('いいねを追加できる', async () => {
        const userId = new mongoose.Types.ObjectId();
        
        const post = new Post({
          title: 'タイトル',
          content: '内容',
          author: new mongoose.Types.ObjectId(),
          authorInfo: {
            name: 'テストユーザー',
            email: 'test@example.com'
          }
        });

        await post.save();
        post.toggleLike(userId);
        
        expect(post.likes).toContainEqual(userId);
        expect(post.likeCount).toBe(1);
      });

      it('既にいいねしている場合は削除される', async () => {
        const userId = new mongoose.Types.ObjectId();
        
        const post = new Post({
          title: 'タイトル',
          content: '内容',
          author: new mongoose.Types.ObjectId(),
          authorInfo: {
            name: 'テストユーザー',
            email: 'test@example.com'
          },
          likes: [userId]
        });

        await post.save();
        post.toggleLike(userId);
        
        expect(post.likes).not.toContainEqual(userId);
        expect(post.likeCount).toBe(0);
      });
    });

    describe('softDelete', () => {
      it('statusをdeletedに変更する', async () => {
        const post = new Post({
          title: 'タイトル',
          content: '内容',
          author: new mongoose.Types.ObjectId(),
          authorInfo: {
            name: 'テストユーザー',
            email: 'test@example.com'
          },
          status: 'published'
        });

        await post.save();
        await post.softDelete();
        
        expect(post.status).toBe('deleted');
      });
    });
  });

  describe('静的メソッド', () => {
    describe('findPublished', () => {
      it('公開投稿のみを取得する', async () => {
        const authorId = new mongoose.Types.ObjectId();
        const authorInfo = {
          name: 'テストユーザー',
          email: 'test@example.com'
        };

        // 異なるステータスの投稿を作成
        await Post.create([
          { title: '公開1', content: '内容', author: authorId, authorInfo, status: 'published' },
          { title: '公開2', content: '内容', author: authorId, authorInfo, status: 'published' },
          { title: '下書き', content: '内容', author: authorId, authorInfo, status: 'draft' },
          { title: '削除済み', content: '内容', author: authorId, authorInfo, status: 'deleted' }
        ]);

        const published = await Post.findPublished();
        
        expect(published).toHaveLength(2);
        expect(published.every(p => p.status === 'published')).toBe(true);
      });
    });

    describe('paginate', () => {
      beforeEach(async () => {
        const authorId = new mongoose.Types.ObjectId();
        const authorInfo = {
          name: 'テストユーザー',
          email: 'test@example.com'
        };

        // 25件の投稿を作成
        const posts = [];
        for (let i = 1; i <= 25; i++) {
          posts.push({
            title: `投稿${i}`,
            content: `内容${i}`,
            author: authorId,
            authorInfo,
            status: 'published'
          });
        }
        await Post.create(posts);
      });

      it('ページネーション情報を含めて投稿を取得する', async () => {
        const result = await Post.paginate({
          page: 1,
          limit: 10
        });

        expect(result.posts).toHaveLength(10);
        expect(result.pagination.page).toBe(1);
        expect(result.pagination.limit).toBe(10);
        expect(result.pagination.total).toBe(25);
        expect(result.pagination.totalPages).toBe(3);
        expect(result.pagination.hasNext).toBe(true);
        expect(result.pagination.hasPrev).toBe(false);
      });

      it('2ページ目を正しく取得する', async () => {
        const result = await Post.paginate({
          page: 2,
          limit: 10
        });

        expect(result.posts).toHaveLength(10);
        expect(result.pagination.page).toBe(2);
        expect(result.pagination.hasNext).toBe(true);
        expect(result.pagination.hasPrev).toBe(true);
      });

      it('最終ページを正しく取得する', async () => {
        const result = await Post.paginate({
          page: 3,
          limit: 10
        });

        expect(result.posts).toHaveLength(5);
        expect(result.pagination.page).toBe(3);
        expect(result.pagination.hasNext).toBe(false);
        expect(result.pagination.hasPrev).toBe(true);
      });
    });
  });

  describe('Pre-saveミドルウェア', () => {
    it('重複するタグを自動的に削除する', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        },
        tags: ['JavaScript', 'React', 'JavaScript', 'React', 'Node.js']
      });

      await post.save();
      expect(post.tags).toEqual(['JavaScript', 'React', 'Node.js']);
    });

    it('タグが5個を超える場合はエラーになる', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        },
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6']
      });

      await expect(post.save()).rejects.toThrow(/タグは最大5個まで/);
    });
  });

  describe('JSONトランスフォーマー', () => {
    it('toJSONで仮想プロパティを含める', async () => {
      const post = new Post({
        title: 'タイトル',
        content: '内容',
        author: new mongoose.Types.ObjectId(),
        authorInfo: {
          name: 'テストユーザー',
          email: 'test@example.com'
        },
        likes: [new mongoose.Types.ObjectId()]
      });

      await post.save();
      const json = post.toJSON();
      
      expect(json.id).toBeDefined();
      expect(json.likeCount).toBe(1);
      expect(json.__v).toBeUndefined();
    });
  });
});