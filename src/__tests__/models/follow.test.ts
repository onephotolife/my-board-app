/**
 * フォロー機能統合テスト
 * 
 * テスト内容：
 * 1. ユーザーAがBをフォロー
 * 2. カウントが増えるか確認
 * 3. 重複フォローの防止確認
 * 4. アンフォローが動くか確認
 */

import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

import type { IUser } from '@/lib/models/User';
import User from '@/lib/models/User';
import Follow from '@/lib/models/Follow';

let mongoServer: MongoMemoryServer;
let userA: IUser;
let userB: IUser;
let userC: IUser;

// テスト環境のセットアップ
beforeAll(async () => {
  // MongoDB Memory Server起動
  mongoServer = await MongoMemoryServer.create();
  const mongoUri = mongoServer.getUri();
  await mongoose.connect(mongoUri);
  
  console.log('✅ Test MongoDB connected');
});

// 各テスト前の初期化
beforeEach(async () => {
  // コレクションをクリア
  await User.deleteMany({});
  await Follow.deleteMany({});
  
  // テストユーザー作成
  userA = await User.create({
    email: 'userA@test.com',
    password: 'Test1234!',
    name: 'User A',
    emailVerified: true,
  });
  
  userB = await User.create({
    email: 'userB@test.com',
    password: 'Test1234!',
    name: 'User B',
    emailVerified: true,
  });
  
  userC = await User.create({
    email: 'userC@test.com',
    password: 'Test1234!',
    name: 'User C',
    emailVerified: true,
  });
  
  console.log('📝 Test users created');
});

// テスト環境のクリーンアップ
afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
  console.log('🔌 Test MongoDB disconnected');
});

describe('フォロー機能テスト', () => {
  
  describe('1. 基本的なフォロー操作', () => {
    
    test('ユーザーAがユーザーBをフォローできる', async () => {
      // 実行
      await userA.follow(userB._id.toString());
      
      // 検証
      const isFollowing = await userA.isFollowing(userB._id.toString());
      expect(isFollowing).toBe(true);
      
      // フォロー関係がDBに存在することを確認
      const followRelation = await Follow.findOne({
        follower: userA._id,
        following: userB._id,
      });
      expect(followRelation).toBeTruthy();
      expect(followRelation?.follower.toString()).toBe(userA._id.toString());
      expect(followRelation?.following.toString()).toBe(userB._id.toString());
    });
    
    test('自分自身をフォローできない', async () => {
      // 実行と検証
      await expect(
        userA.follow(userA._id.toString())
      ).rejects.toThrow('自分自身をフォローすることはできません');
      
      // フォロー関係が作成されていないことを確認
      const followCount = await Follow.countDocuments({
        follower: userA._id,
        following: userA._id,
      });
      expect(followCount).toBe(0);
    });
    
    test('存在しないユーザーをフォローできない', async () => {
      const fakeId = new mongoose.Types.ObjectId();
      
      // 実行と検証
      await expect(
        userA.follow(fakeId.toString())
      ).rejects.toThrow('フォロー対象のユーザーが存在しません');
    });
    
    test('無効なユーザーIDでフォローできない', async () => {
      // 実行と検証
      await expect(
        userA.follow('invalid-id')
      ).rejects.toThrow('無効なユーザーIDです');
    });
  });
  
  describe('2. カウンターの更新確認', () => {
    
    test('フォロー時にカウンターが正しく更新される', async () => {
      // 初期状態の確認
      expect(userA.followingCount).toBe(0);
      expect(userB.followersCount).toBe(0);
      
      // フォロー実行
      await userA.follow(userB._id.toString());
      
      // DBから最新データを取得
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);
      
      // カウンターが更新されていることを確認
      expect(updatedUserA?.followingCount).toBe(1);
      expect(updatedUserB?.followersCount).toBe(1);
    });
    
    test('複数フォロー時のカウンターが正確', async () => {
      // userAが複数ユーザーをフォロー
      await userA.follow(userB._id.toString());
      await userA.follow(userC._id.toString());
      
      // userBもuserCをフォロー
      await userB.follow(userC._id.toString());
      
      // 最新データを取得
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);
      const updatedUserC = await User.findById(userC._id);
      
      // 各ユーザーのカウンターを確認
      expect(updatedUserA?.followingCount).toBe(2); // AはBとCをフォロー
      expect(updatedUserA?.followersCount).toBe(0); // Aは誰からもフォローされていない
      
      expect(updatedUserB?.followingCount).toBe(1); // BはCをフォロー
      expect(updatedUserB?.followersCount).toBe(1); // BはAからフォローされている
      
      expect(updatedUserC?.followingCount).toBe(0); // Cは誰もフォローしていない
      expect(updatedUserC?.followersCount).toBe(2); // CはAとBからフォローされている
    });
    
    test('相互フォロー時のカウンターが正確', async () => {
      // AがBをフォロー
      await userA.follow(userB._id.toString());
      
      // BがAをフォロー（相互フォロー）
      await userB.follow(userA._id.toString());
      
      // 最新データを取得
      const updatedUserA = await User.findById(userA._id);
      const updatedUserB = await User.findById(userB._id);
      
      // カウンターを確認
      expect(updatedUserA?.followingCount).toBe(1);
      expect(updatedUserA?.followersCount).toBe(1);
      expect(updatedUserA?.mutualFollowsCount).toBe(1);
      
      expect(updatedUserB?.followingCount).toBe(1);
      expect(updatedUserB?.followersCount).toBe(1);
      expect(updatedUserB?.mutualFollowsCount).toBe(1);
      
      // Followドキュメントの相互フォローフラグを確認
      const followAtoB = await Follow.findOne({
        follower: userA._id,
        following: userB._id,
      });
      const followBtoA = await Follow.findOne({
        follower: userB._id,
        following: userA._id,
      });
      
      expect(followAtoB?.isReciprocal).toBe(true);
      expect(followBtoA?.isReciprocal).toBe(true);
    });
  });
  
  describe('3. 重複フォローの防止', () => {
    
    test('同じユーザーを重複してフォローできない', async () => {
      // 1回目のフォロー（成功）
      await userA.follow(userB._id.toString());
      
      // 2回目のフォロー（失敗）
      await expect(
        userA.follow(userB._id.toString())
      ).rejects.toThrow('既にフォローしています');
      
      // フォロー関係は1つだけ存在
      const followCount = await Follow.countDocuments({
        follower: userA._id,
        following: userB._id,
      });
      expect(followCount).toBe(1);
      
      // カウンターも1のまま
      const updatedUserA = await User.findById(userA._id);
      expect(updatedUserA?.followingCount).toBe(1);
    });
    
    test('複合ユニークインデックスによる重複防止', async () => {
      // 最初のフォロー
      await userA.follow(userB._id.toString());
      
      // 直接Followドキュメントを作成しようとする
      try {
        await Follow.create({
          follower: userA._id,
          following: userB._id,
        });
        fail('重複フォローが作成されてしまった');
      } catch (error: any) {
        // MongoDBのユニーク制約違反エラーを確認
        expect(error.code).toBe(11000); // Duplicate key error
      }
    });
  });
  
  describe('4. アンフォロー機能', () => {
    
    beforeEach(async () => {
      // 各テストの前にフォロー関係を作成
      await userA.follow(userB._id.toString());
      await userB.follow(userC._id.toString());
    });
    
    test('フォローしているユーザーをアンフォローできる', async () => {
      // アンフォロー前の確認
      let isFollowing = await userA.isFollowing(userB._id.toString());
      expect(isFollowing).toBe(true);
      
      // アンフォロー実行
      await userA.unfollow(userB._id.toString());
      
      // アンフォロー後の確認
      isFollowing = await userA.isFollowing(userB._id.toString());
      expect(isFollowing).toBe(false);
      
      // DBからも削除されていることを確認
      const followRelation = await Follow.findOne({
        follower: userA._id,
        following: userB._id,
      });
      expect(followRelation).toBeNull();
    });
    
    test('アンフォロー時にカウンターが正しく更新される', async () => {
      // アンフォロー前のカウンター確認
      let updatedUserA = await User.findById(userA._id);
      let updatedUserB = await User.findById(userB._id);
      expect(updatedUserA?.followingCount).toBe(1);
      expect(updatedUserB?.followersCount).toBe(1);
      
      // アンフォロー実行
      await userA.unfollow(userB._id.toString());
      
      // アンフォロー後のカウンター確認
      updatedUserA = await User.findById(userA._id);
      updatedUserB = await User.findById(userB._id);
      expect(updatedUserA?.followingCount).toBe(0);
      expect(updatedUserB?.followersCount).toBe(0);
    });
    
    test('相互フォロー解除時の処理', async () => {
      // 相互フォローを作成
      await userB.follow(userA._id.toString());
      
      // 相互フォロー状態を確認
      const followAtoB = await Follow.findOne({
        follower: userA._id,
        following: userB._id,
      });
      let followBtoA = await Follow.findOne({
        follower: userB._id,
        following: userA._id,
      });
      expect(followAtoB?.isReciprocal).toBe(true);
      expect(followBtoA?.isReciprocal).toBe(true);
      
      // AがBのフォローを解除
      await userA.unfollow(userB._id.toString());
      
      // 相互フォローが解除されていることを確認
      followBtoA = await Follow.findOne({
        follower: userB._id,
        following: userA._id,
      });
      expect(followBtoA?.isReciprocal).toBe(false);
      
      // カウンターも更新されていることを確認
      const updatedUserB = await User.findById(userB._id);
      expect(updatedUserB?.mutualFollowsCount).toBe(0);
    });
    
    test('フォローしていないユーザーをアンフォローできない', async () => {
      // CはAをフォローしていない
      await expect(
        userC.unfollow(userA._id.toString())
      ).rejects.toThrow('フォローしていません');
    });
    
    test('無効なユーザーIDでアンフォローできない', async () => {
      await expect(
        userA.unfollow('invalid-id')
      ).rejects.toThrow('無効なユーザーIDです');
    });
  });
  
  describe('5. フォロワー/フォロー中リストの取得', () => {
    
    beforeEach(async () => {
      // フォロー関係を設定
      await userA.follow(userB._id.toString());
      await userA.follow(userC._id.toString());
      await userB.follow(userA._id.toString());
      await userB.follow(userC._id.toString());
      await userC.follow(userA._id.toString());
    });
    
    test('フォロワーリストを取得できる', async () => {
      // userAのフォロワーを取得
      const followers = await userA.getFollowers();
      
      // BとCがフォロワーとして含まれている
      expect(followers).toHaveLength(2);
      const followerIds = followers.map(f => f.follower._id.toString());
      expect(followerIds).toContain(userB._id.toString());
      expect(followerIds).toContain(userC._id.toString());
    });
    
    test('フォロー中リストを取得できる', async () => {
      // userBのフォロー中リストを取得
      const following = await userB.getFollowing();
      
      // AとCをフォローしている
      expect(following).toHaveLength(2);
      const followingIds = following.map(f => f.following._id.toString());
      expect(followingIds).toContain(userA._id.toString());
      expect(followingIds).toContain(userC._id.toString());
    });
    
    test('ページネーションが機能する', async () => {
      // 1ページ目（1件）
      const page1 = await userB.getFollowing(1, 1);
      expect(page1).toHaveLength(1);
      
      // 2ページ目（1件）
      const page2 = await userB.getFollowing(2, 1);
      expect(page2).toHaveLength(1);
      
      // 3ページ目（0件）
      const page3 = await userB.getFollowing(3, 1);
      expect(page3).toHaveLength(0);
    });
  });
  
  describe('6. パフォーマンステスト', () => {
    
    test('updateFollowCounts()のパフォーマンス', async () => {
      // 複数のフォロー関係を作成
      const users = await Promise.all(
        Array(10).fill(null).map((_, i) => 
          User.create({
            email: `test${i}@test.com`,
            password: 'Test1234!',
            name: `Test User ${i}`,
            emailVerified: true,
          })
        )
      );
      
      // 全員がuserAをフォロー
      await Promise.all(
        users.map(user => user.follow(userA._id.toString()))
      );
      
      // カウント更新の実行時間を計測
      const startTime = Date.now();
      await userA.updateFollowCounts();
      const endTime = Date.now();
      
      const executionTime = endTime - startTime;
      console.log(`updateFollowCounts実行時間: ${executionTime}ms`);
      
      // 1秒以内に完了することを確認
      expect(executionTime).toBeLessThan(1000);
      
      // カウントが正確であることを確認
      const updatedUserA = await User.findById(userA._id);
      expect(updatedUserA?.followersCount).toBe(10);
    });
  });
});

// エクスポート（他のテストから利用可能）
export { mongoServer };