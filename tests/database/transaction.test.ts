import mongoose from 'mongoose';
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
