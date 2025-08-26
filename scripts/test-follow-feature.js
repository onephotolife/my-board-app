#!/usr/bin/env node

/**
 * フォロー機能の簡易テストスクリプト
 * 
 * 実行方法:
 * node scripts/test-follow-feature.js
 * または
 * npm run test:follow
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// 環境変数の読み込み
dotenv.config({ path: path.join(__dirname, '../.env.local') });

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

// テスト結果カウンター
let passedCount = 0;
let failedCount = 0;
const results = [];

// ログ関数
function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logTest(name, passed, error = null) {
  const status = passed ? '✅ PASS' : '❌ FAIL';
  const color = passed ? colors.green : colors.red;
  
  log(`  ${status}: ${name}`, color);
  
  if (passed) {
    passedCount++;
  } else {
    failedCount++;
    if (error) {
      log(`      Error: ${error.message}`, colors.gray);
    }
  }
  
  results.push({ name, passed, error: error?.message });
}

// メインテスト関数
async function runFollowTests() {
  let userA, userB, userC;
  let User, Follow;
  
  try {
    log('\n🚀 フォロー機能テスト開始\n', colors.blue);
    
    // MongoDB接続
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app-test';
    await mongoose.connect(mongoUri);
    log('📊 MongoDB接続成功\n', colors.green);
    
    // モデルのロード（TypeScript用の処理）
    // ts-nodeを使用するか、ビルド済みのJSファイルを参照
    try {
      // TypeScriptコンパイル済みの場合
      User = require('../.next/server/chunks/User').default;
      Follow = require('../.next/server/chunks/Follow').default;
    } catch (e) {
      // 直接TypeScriptファイルを読み込む（ts-node経由）
      require('ts-node/register');
      User = require('../src/lib/models/User').default;
      Follow = require('../src/lib/models/Follow').default;
    }
    
    // テストデータのクリーンアップ
    log('🧹 テストデータをクリーンアップ中...', colors.gray);
    await User.deleteMany({ email: { $regex: /^test.*@test\.com$/ } });
    await Follow.deleteMany({});
    
    // テストユーザー作成
    log('👤 テストユーザーを作成中...', colors.gray);
    userA = await User.create({
      email: 'testA@test.com',
      password: 'Test1234!',
      name: 'Test User A',
      emailVerified: true,
    });
    
    userB = await User.create({
      email: 'testB@test.com',
      password: 'Test1234!',
      name: 'Test User B',
      emailVerified: true,
    });
    
    userC = await User.create({
      email: 'testC@test.com',
      password: 'Test1234!',
      name: 'Test User C',
      emailVerified: true,
    });
    
    log('');
    log('='.repeat(50), colors.gray);
    log('📝 テスト実行', colors.yellow);
    log('='.repeat(50), colors.gray);
    
    // テスト1: 基本的なフォロー
    log('\n1️⃣ 基本的なフォロー操作', colors.blue);
    
    try {
      await userA.follow(userB._id.toString());
      const isFollowing = await userA.isFollowing(userB._id.toString());
      logTest('ユーザーAがBをフォローできる', isFollowing === true);
    } catch (error) {
      logTest('ユーザーAがBをフォローできる', false, error);
    }
    
    // テスト2: カウントの確認
    log('\n2️⃣ カウンターの更新確認', colors.blue);
    
    try {
      const updatedA = await User.findById(userA._id);
      const updatedB = await User.findById(userB._id);
      
      logTest('Aのフォロー数が1になる', updatedA.followingCount === 1);
      logTest('Bのフォロワー数が1になる', updatedB.followersCount === 1);
      
      // 追加フォロー
      await userA.follow(userC._id.toString());
      await userC.follow(userA._id.toString());
      
      const finalA = await User.findById(userA._id);
      logTest('Aのフォロー数が2になる', finalA.followingCount === 2);
      logTest('Aのフォロワー数が1になる', finalA.followersCount === 1);
    } catch (error) {
      logTest('カウンター更新', false, error);
    }
    
    // テスト3: 重複フォロー防止
    log('\n3️⃣ 重複フォローの防止', colors.blue);
    
    try {
      await userA.follow(userB._id.toString());
      logTest('重複フォローでエラー', false); // ここに来たら失敗
    } catch (error) {
      const isDuplicateError = error.message.includes('既にフォローしています');
      logTest('重複フォローでエラー', isDuplicateError, error);
    }
    
    // カウントが増えていないことを確認
    try {
      const checkA = await User.findById(userA._id);
      logTest('重複試行後もカウントは変わらない', checkA.followingCount === 2);
    } catch (error) {
      logTest('重複試行後もカウントは変わらない', false, error);
    }
    
    // テスト4: アンフォロー
    log('\n4️⃣ アンフォロー機能', colors.blue);
    
    try {
      await userA.unfollow(userB._id.toString());
      const isFollowing = await userA.isFollowing(userB._id.toString());
      logTest('Bのフォローを解除できる', isFollowing === false);
      
      const afterUnfollowA = await User.findById(userA._id);
      const afterUnfollowB = await User.findById(userB._id);
      
      logTest('Aのフォロー数が1減る', afterUnfollowA.followingCount === 1);
      logTest('Bのフォロワー数が0になる', afterUnfollowB.followersCount === 0);
    } catch (error) {
      logTest('アンフォロー', false, error);
    }
    
    // テスト5: 相互フォロー
    log('\n5️⃣ 相互フォロー', colors.blue);
    
    try {
      // 新しい相互フォローを作成
      await userB.follow(userC._id.toString());
      await userC.follow(userB._id.toString());
      
      const mutualB = await User.findById(userB._id);
      const mutualC = await User.findById(userC._id);
      
      logTest('相互フォロー数が更新される', 
        mutualB.mutualFollowsCount === 1 && mutualC.mutualFollowsCount === 1
      );
      
      // Followドキュメントの確認
      const followBtoC = await Follow.findOne({
        follower: userB._id,
        following: userC._id,
      });
      
      logTest('相互フォローフラグが設定される', followBtoC.isReciprocal === true);
    } catch (error) {
      logTest('相互フォロー', false, error);
    }
    
    // テスト6: 自己フォロー防止
    log('\n6️⃣ 自己フォロー防止', colors.blue);
    
    try {
      await userA.follow(userA._id.toString());
      logTest('自分自身をフォローできない', false); // ここに来たら失敗
    } catch (error) {
      const isSelfFollowError = error.message.includes('自分自身をフォロー');
      logTest('自分自身をフォローできない', isSelfFollowError, error);
    }
    
  } catch (error) {
    log(`\n❌ テストエラー: ${error.message}`, colors.red);
    console.error(error);
  } finally {
    // クリーンアップ
    if (userA || userB || userC) {
      log('\n🧹 テストデータをクリーンアップ中...', colors.gray);
      
      try {
        await User.deleteMany({ 
          email: { $in: ['testA@test.com', 'testB@test.com', 'testC@test.com'] }
        });
        
        if (userA && userB && userC) {
          await Follow.deleteMany({
            $or: [
              { follower: { $in: [userA._id, userB._id, userC._id] } },
              { following: { $in: [userA._id, userB._id, userC._id] } },
            ]
          });
        }
      } catch (cleanupError) {
        log('⚠️  クリーンアップエラー:', colors.yellow);
        console.error(cleanupError);
      }
    }
    
    // MongoDB切断
    await mongoose.disconnect();
    log('🔌 MongoDB接続終了\n', colors.gray);
    
    // 結果サマリー
    log('='.repeat(50), colors.gray);
    log('📊 テスト結果サマリー', colors.yellow);
    log('='.repeat(50), colors.gray);
    
    const total = passedCount + failedCount;
    const passRate = total > 0 ? Math.round((passedCount / total) * 100) : 0;
    
    log(`\n  合計: ${total} テスト`, colors.blue);
    log(`  成功: ${passedCount} テスト`, colors.green);
    log(`  失敗: ${failedCount} テスト`, failedCount > 0 ? colors.red : colors.gray);
    log(`  成功率: ${passRate}%`, passRate === 100 ? colors.green : colors.yellow);
    
    if (failedCount > 0) {
      log('\n❌ 失敗したテスト:', colors.red);
      results.filter(r => !r.passed).forEach(r => {
        log(`  - ${r.name}`, colors.red);
        if (r.error) {
          log(`    ${r.error}`, colors.gray);
        }
      });
    } else {
      log('\n✅ すべてのテストが成功しました！', colors.green);
    }
    
    log('');
    
    // プロセス終了コード
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

// 実行
runFollowTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});