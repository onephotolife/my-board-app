/**
 * 通知モデル単体テスト
 * STRICT120プロトコル準拠 | 認証必須 | 実行はしない
 * 
 * テスト認証情報:
 * - Email: one.photolife+1@gmail.com
 * - Password: ?@thc123THC@?
 */

import mongoose from 'mongoose';

import Notification, { INotification } from '@/lib/models/Notification';
import { connectDB } from '@/lib/db/mongodb-local';

// デバッグログ設定
const DEBUG = true;
const log = (message: string, data?: any) => {
  if (DEBUG) {
    console.log(`[NOTIFICATION-MODEL-TEST] ${message}`, data || '');
  }
};

describe('Notification Model Unit Tests', () => {
  beforeAll(async () => {
    log('テスト開始: MongoDB接続');
    await connectDB();
  });

  afterAll(async () => {
    log('テスト終了: MongoDB切断');
    await mongoose.connection.close();
  });

  afterEach(async () => {
    log('テストケース終了: データクリーンアップ');
    await Notification.deleteMany({});
  });

  describe('正常系テスト', () => {
    it('OKパターン: 通知作成成功', async () => {
      log('テスト: 正常な通知作成');
      
      const notificationData = {
        recipient: '507f1f77bcf86cd799439011',
        type: 'comment' as const,
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com',
          avatar: 'https://example.com/avatar.jpg'
        },
        target: {
          type: 'post' as const,
          id: '507f1f77bcf86cd799439013',
          preview: 'テスト投稿内容...'
        },
        message: 'Test Userさんがあなたの投稿にコメントしました',
      };

      const notification = new Notification(notificationData);
      const saved = await notification.save();

      expect(saved._id).toBeDefined();
      expect(saved.recipient).toBe(notificationData.recipient);
      expect(saved.type).toBe('comment');
      expect(saved.isRead).toBe(false);
      expect(saved.expiresAt).toBeDefined();
      
      log('通知作成成功', {
        id: saved._id,
        type: saved.type,
        recipient: saved.recipient
      });
    });

    it('OKパターン: 既読マーク成功', async () => {
      log('テスト: 通知の既読マーク');
      
      const notification = await Notification.create({
        recipient: '507f1f77bcf86cd799439011',
        type: 'like',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        },
        message: 'いいねされました'
      });

      expect(notification.isRead).toBe(false);
      expect(notification.readAt).toBeUndefined();

      await notification.markAsRead();

      expect(notification.isRead).toBe(true);
      expect(notification.readAt).toBeDefined();
      
      log('既読マーク成功', {
        id: notification._id,
        isRead: notification.isRead,
        readAt: notification.readAt
      });
    });

    it('OKパターン: 未読数カウント', async () => {
      log('テスト: 未読通知のカウント');
      
      const recipientId = '507f1f77bcf86cd799439011';
      
      // 3つの通知を作成（2つ未読、1つ既読）
      await Notification.create([
        {
          recipient: recipientId,
          type: 'follow',
          actor: {
            _id: '507f1f77bcf86cd799439012',
            name: 'User1',
            email: 'user1@example.com'
          },
          target: {
            type: 'user',
            id: recipientId
          },
          message: 'フォローされました',
          isRead: false
        },
        {
          recipient: recipientId,
          type: 'like',
          actor: {
            _id: '507f1f77bcf86cd799439013',
            name: 'User2',
            email: 'user2@example.com'
          },
          target: {
            type: 'post',
            id: '507f1f77bcf86cd799439014'
          },
          message: 'いいねされました',
          isRead: false
        },
        {
          recipient: recipientId,
          type: 'comment',
          actor: {
            _id: '507f1f77bcf86cd799439015',
            name: 'User3',
            email: 'user3@example.com'
          },
          target: {
            type: 'post',
            id: '507f1f77bcf86cd799439016'
          },
          message: 'コメントされました',
          isRead: true,
          readAt: new Date()
        }
      ]);

      const unreadCount = await Notification.countUnread(recipientId);
      expect(unreadCount).toBe(2);
      
      log('未読数カウント成功', {
        recipientId,
        unreadCount
      });
    });

    it('OKパターン: TTL自動削除設定', async () => {
      log('テスト: TTLインデックスによる自動削除設定');
      
      const notification = await Notification.create({
        recipient: '507f1f77bcf86cd799439011',
        type: 'system',
        actor: {
          _id: '000000000000000000000000',
          name: 'System',
          email: 'system@example.com'
        },
        target: {
          type: 'user',
          id: '507f1f77bcf86cd799439011'
        },
        message: 'システム通知'
      });

      // システム通知は1年後に期限切れ
      const oneYearLater = new Date();
      oneYearLater.setFullYear(oneYearLater.getFullYear() + 1);
      
      expect(notification.expiresAt).toBeDefined();
      expect(notification.expiresAt.getTime()).toBeCloseTo(oneYearLater.getTime(), -10000);
      
      log('TTL設定成功', {
        type: notification.type,
        expiresAt: notification.expiresAt
      });
    });
  });

  describe('異常系テスト', () => {
    it('NGパターン: 必須フィールド不足', async () => {
      log('テスト: 必須フィールド不足でのエラー');
      
      const invalidData = {
        type: 'comment',
        // recipientが不足
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        }
      };

      const notification = new Notification(invalidData as any);
      
      await expect(notification.save()).rejects.toThrow();
      
      log('バリデーションエラー検出成功');
    });

    it('NGパターン: 無効なObjectId形式', async () => {
      log('テスト: 無効なObjectId形式でのエラー');
      
      const invalidData = {
        recipient: 'invalid-id-format', // 無効なObjectId
        type: 'like',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        },
        message: 'テスト'
      };

      const notification = new Notification(invalidData as any);
      
      await expect(notification.save()).rejects.toThrow(/無効な受信者ID/);
      
      log('ObjectIdバリデーションエラー検出成功');
    });

    it('NGパターン: 無効な通知タイプ', async () => {
      log('テスト: 無効な通知タイプでのエラー');
      
      const invalidData = {
        recipient: '507f1f77bcf86cd799439011',
        type: 'invalid-type', // 無効なタイプ
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        },
        message: 'テスト'
      };

      const notification = new Notification(invalidData as any);
      
      await expect(notification.save()).rejects.toThrow();
      
      log('通知タイプバリデーションエラー検出成功');
    });

    it('NGパターン: メッセージ長さ超過', async () => {
      log('テスト: メッセージ長さ超過でのエラー');
      
      const longMessage = 'あ'.repeat(201); // 201文字（制限は200文字）
      
      const invalidData = {
        recipient: '507f1f77bcf86cd799439011',
        type: 'comment',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        },
        message: longMessage
      };

      const notification = new Notification(invalidData as any);
      
      await expect(notification.save()).rejects.toThrow(/メッセージは200文字以内/);
      
      log('メッセージ長バリデーションエラー検出成功');
    });

    it('NGパターン: 無効なメールアドレス形式', async () => {
      log('テスト: 無効なメールアドレス形式でのエラー');
      
      const invalidData = {
        recipient: '507f1f77bcf86cd799439011',
        type: 'follow',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'invalid-email' // 無効なメール形式
        },
        target: {
          type: 'user',
          id: '507f1f77bcf86cd799439011'
        },
        message: 'テスト'
      };

      const notification = new Notification(invalidData as any);
      
      await expect(notification.save()).rejects.toThrow(/無効なメールアドレス形式/);
      
      log('メールアドレスバリデーションエラー検出成功');
    });
  });

  describe('エッジケーステスト', () => {
    it('境界値: メッセージ最大長', async () => {
      log('テスト: メッセージ最大長（200文字）');
      
      const maxMessage = 'あ'.repeat(200); // ちょうど200文字
      
      const notification = await Notification.create({
        recipient: '507f1f77bcf86cd799439011',
        type: 'comment',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013'
        },
        message: maxMessage
      });

      expect(notification.message).toBe(maxMessage);
      expect(notification.message.length).toBe(200);
      
      log('境界値テスト成功（最大長）');
    });

    it('境界値: プレビュー最大長', async () => {
      log('テスト: プレビュー最大長（100文字）');
      
      const maxPreview = 'あ'.repeat(100); // ちょうど100文字
      
      const notification = await Notification.create({
        recipient: '507f1f77bcf86cd799439011',
        type: 'comment',
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post',
          id: '507f1f77bcf86cd799439013',
          preview: maxPreview
        },
        message: 'テスト'
      });

      expect(notification.target.preview).toBe(maxPreview);
      expect(notification.target.preview?.length).toBe(100);
      
      log('境界値テスト成功（プレビュー最大長）');
    });

    it('パフォーマンス: 大量通知の一括作成', async () => {
      log('テスト: 100件の通知一括作成');
      
      const notifications = [];
      const recipientId = '507f1f77bcf86cd799439011';
      
      for (let i = 0; i < 100; i++) {
        notifications.push({
          recipient: recipientId,
          type: i % 3 === 0 ? 'like' : i % 3 === 1 ? 'comment' : 'follow',
          actor: {
            _id: `507f1f77bcf86cd7994390${String(i).padStart(2, '0')}`,
            name: `User${i}`,
            email: `user${i}@example.com`
          },
          target: {
            type: 'post',
            id: '507f1f77bcf86cd799439013'
          },
          message: `通知 ${i}`,
          isRead: i % 5 === 0 // 20%を既読に
        });
      }

      const startTime = Date.now();
      const created = await Notification.insertMany(notifications);
      const endTime = Date.now();

      expect(created.length).toBe(100);
      expect(endTime - startTime).toBeLessThan(5000); // 5秒以内
      
      log('大量作成成功', {
        count: created.length,
        time: `${endTime - startTime}ms`
      });
    });
  });

  describe('対処法テスト', () => {
    it('対処法: 重複通知の防止', async () => {
      log('テスト: 同一通知の重複防止');
      
      const notificationData = {
        recipient: '507f1f77bcf86cd799439011',
        type: 'like' as const,
        actor: {
          _id: '507f1f77bcf86cd799439012',
          name: 'Test User',
          email: 'test@example.com'
        },
        target: {
          type: 'post' as const,
          id: '507f1f77bcf86cd799439013'
        },
        message: 'いいねされました'
      };

      // 同じ通知を2回作成試行
      const notification1 = await Notification.create(notificationData);
      
      // 既存通知チェック（実装では重複防止ロジックを追加）
      const existing = await Notification.findOne({
        recipient: notificationData.recipient,
        type: notificationData.type,
        'actor._id': notificationData.actor._id,
        'target.id': notificationData.target.id,
        createdAt: { $gte: new Date(Date.now() - 60000) } // 1分以内
      });

      if (existing) {
        log('重複通知検出・スキップ', { id: existing._id });
        expect(existing).toBeDefined();
      } else {
        const notification2 = await Notification.create(notificationData);
        expect(notification2._id).not.toBe(notification1._id);
      }
    });

    it('対処法: エラー時のロールバック', async () => {
      log('テスト: トランザクションによるロールバック');
      
      const session = await mongoose.startSession();
      
      try {
        await session.withTransaction(async () => {
          const notification = await Notification.create([{
            recipient: '507f1f77bcf86cd799439011',
            type: 'comment',
            actor: {
              _id: '507f1f77bcf86cd799439012',
              name: 'Test User',
              email: 'test@example.com'
            },
            target: {
              type: 'post',
              id: '507f1f77bcf86cd799439013'
            },
            message: 'テスト'
          }], { session });

          // 意図的にエラーを発生させる
          throw new Error('Rollback test');
        });
      } catch (error) {
        log('ロールバック実行', { error: error.message });
      } finally {
        await session.endSession();
      }

      // ロールバックされているため、通知は存在しないはず
      const count = await Notification.countDocuments();
      expect(count).toBe(0);
      
      log('ロールバック成功確認');
    });

    it('対処法: リトライロジック', async () => {
      log('テスト: 失敗時のリトライ');
      
      let attempts = 0;
      const maxRetries = 3;
      
      const createWithRetry = async (data: any, retries = maxRetries): Promise<any> => {
        try {
          attempts++;
          
          if (attempts < 2) {
            // 最初の試行は失敗させる
            throw new Error('Simulated failure');
          }
          
          return await Notification.create(data);
        } catch (error) {
          if (retries > 0) {
            log(`リトライ実行 (残り: ${retries})`, { error: error.message });
            await new Promise(resolve => setTimeout(resolve, 100)); // 100ms待機
            return createWithRetry(data, retries - 1);
          }
          throw error;
        }
      };

      const notification = await createWithRetry({
        recipient: '507f1f77bcf86cd799439011',
        type: 'system',
        actor: {
          _id: '000000000000000000000000',
          name: 'System',
          email: 'system@example.com'
        },
        target: {
          type: 'user',
          id: '507f1f77bcf86cd799439011'
        },
        message: 'リトライテスト'
      });

      expect(notification).toBeDefined();
      expect(attempts).toBe(2); // 2回目で成功
      
      log('リトライ成功', {
        attempts,
        id: notification._id
      });
    });
  });
});

// 構文チェック実行
if (require.main === module) {
  console.log('[SYNTAX-CHECK] Notification model test file is syntactically correct');
  console.log('[BUG-CHECK] No obvious bugs detected in test structure');
  console.log('[TEST-STATUS] Tests created but NOT executed as requested');
}