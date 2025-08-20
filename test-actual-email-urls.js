#!/usr/bin/env node

/**
 * 実際のメールURL検証スクリプト
 * 14人天才会議 - 実際に送信されるURLを確認
 */

const { MongoClient } = require('mongodb');
const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function checkActualUrls() {
  log('\n🧠 14人天才会議 - 実際のメールURL検証\n', 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // 1. 最新のユーザーのトークンを確認
    log('\n天才1: 最新ユーザーのメール確認トークン確認', 'blue');
    
    const latestUser = await db.collection('users')
      .findOne(
        { emailVerificationToken: { $exists: true } },
        { sort: { createdAt: -1 } }
      );
    
    if (latestUser) {
      log('✅ ユーザー発見', 'green');
      log(`  Email: ${latestUser.email}`, 'cyan');
      log(`  Token: ${latestUser.emailVerificationToken}`, 'cyan');
      
      // 生成されるURLを再現
      const verificationUrl = `http://localhost:3000/auth/verify-email?token=${latestUser.emailVerificationToken}`;
      log(`\n📧 生成される確認メールURL:`, 'yellow');
      log(`  ${verificationUrl}`, 'cyan');
      
      // URLが正しいか確認
      log('\n🔍 URL形式チェック:', 'blue');
      if (verificationUrl.includes('localhost:3000')) {
        log('  ✅ ホスト名: 正常', 'green');
      } else {
        log('  ❌ ホスト名: 異常', 'red');
      }
      
      if (verificationUrl.includes('/auth/verify-email')) {
        log('  ✅ パス: 正常', 'green');
      } else {
        log('  ❌ パス: 異常', 'red');
      }
      
      if (verificationUrl.includes('token=')) {
        log('  ✅ トークンパラメータ: 正常', 'green');
      } else {
        log('  ❌ トークンパラメータ: 異常', 'red');
      }
    } else {
      log('⚠️ 確認トークンを持つユーザーが見つかりません', 'yellow');
    }
    
    // 2. パスワードリセットトークンの確認
    log('\n天才2: パスワードリセットトークン確認', 'blue');
    
    const resetTokenDoc = await db.collection('passwordresets')
      .findOne({}, { sort: { createdAt: -1 } });
    
    if (resetTokenDoc) {
      log('✅ リセットトークン発見', 'green');
      log(`  Email: ${resetTokenDoc.email}`, 'cyan');
      log(`  Token: ${resetTokenDoc.token}`, 'cyan');
      
      // 生成されるURLを再現
      const resetUrl = `http://localhost:3000/auth/reset-password/${resetTokenDoc.token}`;
      log(`\n📧 生成されるリセットメールURL:`, 'yellow');
      log(`  ${resetUrl}`, 'cyan');
      
      // URLが正しいか確認
      log('\n🔍 URL形式チェック:', 'blue');
      if (resetUrl.includes('localhost:3000')) {
        log('  ✅ ホスト名: 正常', 'green');
      } else {
        log('  ❌ ホスト名: 異常', 'red');
      }
      
      if (resetUrl.includes('/auth/reset-password/')) {
        log('  ✅ パス: 正常', 'green');
      } else {
        log('  ❌ パス: 異常', 'red');
      }
      
      if (resetTokenDoc.token && resetTokenDoc.token.length > 0) {
        log('  ✅ トークン: 存在', 'green');
      } else {
        log('  ❌ トークン: 不正', 'red');
      }
    } else {
      log('⚠️ パスワードリセットトークンが見つかりません', 'yellow');
    }
    
    // 3. 問題の診断
    log('\n' + '='.repeat(50), 'cyan');
    log('📊 診断結果', 'magenta');
    log('='.repeat(50), 'cyan');
    
    log('\n🔍 オフラインページが表示される可能性のある原因:', 'yellow');
    log('  1. メール内のURLがエンコードされていない', 'cyan');
    log('  2. メールクライアントがURLを改変している', 'cyan');
    log('  3. React Email のButtonコンポーネントの問題', 'cyan');
    log('  4. Service Workerが干渉している', 'cyan');
    
    log('\n💡 解決策:', 'green');
    log('  1. URLエンコーディングの確認', 'cyan');
    log('  2. React EmailのButtonコンポーネントを<a>タグに変更', 'cyan');
    log('  3. Service Workerのキャッシュクリア', 'cyan');
    log('  4. メールテンプレートの再構築', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
  
  process.exit(0);
}

// 実行
checkActualUrls().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});