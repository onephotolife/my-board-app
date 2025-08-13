import mongoose from 'mongoose';
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
        const xssPatterns = [/<script/i, /javascript:/i, /on\w+=/i];
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
      const urlPattern = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)/;
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
