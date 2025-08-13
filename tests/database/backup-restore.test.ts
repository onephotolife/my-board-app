import { exec } from 'child_process';
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
    await execAsync(`mongodump --db=${dbName} --out=${backupPath}`);

    // データ削除
    await Post.deleteMany({});
    const afterDelete = await Post.countDocuments();
    expect(afterDelete).toBe(0);

    // リストア実行
    await execAsync(`mongorestore --db=${dbName} ${backupPath}/${dbName}`);

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
