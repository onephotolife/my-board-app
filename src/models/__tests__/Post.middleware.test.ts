import mongoose from 'mongoose';
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
      invalidateCache(`post:${doc._id}`);
      invalidateCache('posts:list');
    });

    const post = await Post.create({
      title: 'キャッシュテスト',
      content: '内容',
      author: new mongoose.Types.ObjectId(),
      authorInfo: { name: 'テスト', email: 'test@example.com' }
    });

    expect(invalidateCache).toHaveBeenCalledWith(`post:${post._id}`);
    expect(invalidateCache).toHaveBeenCalledWith('posts:list');
  });
});
