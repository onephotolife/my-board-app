#!/usr/bin/env node

/**
 * テストユーザー作成スクリプト
 * 14人天才会議 - 天才11
 */

const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const MONGODB_URI = 'mongodb://localhost:27017/boardDB';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

async function createTestUsers() {
  log('\n🧠 天才11: テストユーザー作成\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  let mongoClient;
  
  try {
    // MongoDB接続
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const db = mongoClient.db();
    
    // テストユーザー定義
    const testUsers = [
      {
        email: 'unverified@test.com',
        password: 'Test1234!',
        name: '未確認太郎',
        emailVerified: false,
        description: 'メール未確認ユーザー'
      },
      {
        email: 'verified@test.com',
        password: 'Test1234!',
        name: '確認済花子',
        emailVerified: true,
        description: 'メール確認済みユーザー'
      }
    ];
    
    log('\n📋 テストユーザー作成', 'blue');
    log('=' .repeat(70), 'cyan');
    
    for (const userData of testUsers) {
      // 既存ユーザーを削除
      await db.collection('users').deleteOne({ email: userData.email });
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(userData.password, 10);
      
      // ユーザー作成
      await db.collection('users').insertOne({
        email: userData.email,
        password: hashedPassword,
        name: userData.name,
        emailVerified: userData.emailVerified,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      
      log(`\n✅ ${userData.description}`, 'green');
      log(`   Email: ${userData.email}`, 'cyan');
      log(`   Password: ${userData.password}`, 'cyan');
      log(`   EmailVerified: ${userData.emailVerified}`, 
          userData.emailVerified ? 'green' : 'yellow');
    }
    
    log('\n\n' + '='.repeat(70), 'cyan');
    log('📊 手動テスト手順', 'magenta');
    log('='.repeat(70), 'cyan');
    
    log('\n1️⃣  メール未確認ユーザーのテスト:', 'yellow');
    log('   1. http://localhost:3000/auth/signin にアクセス', 'cyan');
    log('   2. Email: unverified@test.com', 'cyan');
    log('   3. Password: Test1234!', 'cyan');
    log('   4. ログインボタンをクリック', 'cyan');
    log('   期待: "メールアドレスの確認が必要です" が表示される', 'green');
    
    log('\n2️⃣  間違ったパスワードのテスト:', 'yellow');
    log('   1. http://localhost:3000/auth/signin にアクセス', 'cyan');
    log('   2. Email: verified@test.com', 'cyan');
    log('   3. Password: WrongPassword!', 'cyan');
    log('   4. ログインボタンをクリック', 'cyan');
    log('   期待: "ログインできませんでした" が表示される', 'green');
    
    log('\n3️⃣  存在しないユーザーのテスト:', 'yellow');
    log('   1. http://localhost:3000/auth/signin にアクセス', 'cyan');
    log('   2. Email: notexist@test.com', 'cyan');
    log('   3. Password: Test1234!', 'cyan');
    log('   4. ログインボタンをクリック', 'cyan');
    log('   期待: "ログインできませんでした" が表示される', 'green');
    
    log('\n4️⃣  正常ログインのテスト:', 'yellow');
    log('   1. http://localhost:3000/auth/signin にアクセス', 'cyan');
    log('   2. Email: verified@test.com', 'cyan');
    log('   3. Password: Test1234!', 'cyan');
    log('   4. ログインボタンをクリック', 'cyan');
    log('   期待: ボード画面に遷移する', 'green');
    
    log('\n='.repeat(70), 'cyan');
    log('🎉 テストユーザーの作成が完了しました！', 'green');
    log('上記の手順で手動テストを実行してください。', 'green');
    log('='.repeat(70) + '\n', 'cyan');
    
  } catch (error) {
    log(`\n❌ エラー発生: ${error.message}`, 'red');
    console.error(error);
  } finally {
    if (mongoClient) {
      await mongoClient.close();
    }
  }
}

// 実行
createTestUsers().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});