#!/usr/bin/env node

/**
 * メール送信テストスクリプト
 * 14人天才会議 - 天才7
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const readline = require('readline');

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function testEmailSending() {
  log('\n🧠 天才7: メール送信テスト\n', 'cyan');
  log('=' .repeat(60), 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    log('\n📧 テストメール送信オプション:', 'yellow');
    log('  1. 確認メール（新規登録）', 'cyan');
    log('  2. パスワードリセットメール', 'cyan');
    log('  3. 両方のメール', 'cyan');
    
    const choice = await question('\n選択してください (1-3): ');
    
    const testEmail = `test-${Date.now()}@example.com`;
    const testUser = `TestUser_${Date.now()}`;
    
    if (choice === '1' || choice === '3') {
      log('\n📨 確認メールのテスト', 'blue');
      
      // テストユーザー作成
      const verificationToken = crypto.randomBytes(32).toString('hex');
      
      await db.collection('users').insertOne({
        name: testUser,
        email: testEmail,
        password: 'hashed_password_here',
        emailVerified: false,
        emailVerificationToken: verificationToken,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      log('✅ テストユーザー作成完了', 'green');
      log(`  Email: ${testEmail}`, 'cyan');
      log(`  Token: ${verificationToken}`, 'cyan');
      
      // 確認用URL生成
      const verificationUrl = `http://localhost:3000/auth/verify-email?token=${verificationToken}`;
      log('\n🔗 生成された確認URL:', 'yellow');
      log(`  ${verificationUrl}`, 'cyan');
      
      // HTMLメールプレビュー
      log('\n📄 メールテンプレート（アンカータグ使用）:', 'magenta');
      log('  <a href="' + verificationUrl + '" style="...">メールアドレスを確認</a>', 'cyan');
      
      log('\n💡 テスト手順:', 'green');
      log('  1. 上記のURLをブラウザで開く', 'cyan');
      log('  2. オフラインページが表示されないことを確認', 'cyan');
      log('  3. 正常な確認ページが表示されることを確認', 'cyan');
    }
    
    if (choice === '2' || choice === '3') {
      log('\n📨 パスワードリセットメールのテスト', 'blue');
      
      // リセットトークン作成
      const resetToken = crypto.randomBytes(32).toString('hex');
      
      await db.collection('passwordresets').insertOne({
        email: testEmail,
        token: resetToken,
        expiresAt: new Date(Date.now() + 3600000), // 1時間後
        createdAt: new Date()
      });
      
      log('✅ リセットトークン作成完了', 'green');
      log(`  Email: ${testEmail}`, 'cyan');
      log(`  Token: ${resetToken}`, 'cyan');
      
      // リセット用URL生成
      const resetUrl = `http://localhost:3000/auth/reset-password/${resetToken}`;
      log('\n🔗 生成されたリセットURL:', 'yellow');
      log(`  ${resetUrl}`, 'cyan');
      
      // HTMLメールプレビュー
      log('\n📄 メールテンプレート（アンカータグ使用）:', 'magenta');
      log('  <a href="' + resetUrl + '" style="...">パスワードをリセット</a>', 'cyan');
      
      log('\n💡 テスト手順:', 'green');
      log('  1. 上記のURLをブラウザで開く', 'cyan');
      log('  2. オフラインページが表示されないことを確認', 'cyan');
      log('  3. 正常なリセットページが表示されることを確認', 'cyan');
    }
    
    log('\n' + '='.repeat(60), 'cyan');
    log('📊 テスト確認ポイント', 'magenta');
    log('='.repeat(60), 'cyan');
    
    log('\n✅ 確認すべき項目:', 'green');
    log('  1. URLをクリックしてオフラインページが表示されない', 'cyan');
    log('  2. 正しいページ（verify-email/reset-password）が表示される', 'cyan');
    log('  3. CSSプリロードエラーが表示されない', 'cyan');
    log('  4. ページが正常にレンダリングされる', 'cyan');
    
    log('\n⚠️  注意事項:', 'yellow');
    log('  • Service Workerのキャッシュをクリアしてからテスト', 'cyan');
    log('  • ブラウザのデベロッパーツールでエラーを確認', 'cyan');
    log('  • Network タブで sw.js の更新を確認', 'cyan');
    
    log('\n🔧 問題が解決しない場合:', 'red');
    log('  1. ブラウザのキャッシュを完全にクリア', 'cyan');
    log('  2. Service Workerを手動で登録解除', 'cyan');
    log('  3. プライベートブラウジングモードでテスト', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
    rl.close();
  }
}

// 実行
testEmailSending().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});