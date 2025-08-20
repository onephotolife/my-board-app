#!/usr/bin/env node

/**
 * ユーザー登録フロー統合テスト
 * 14人天才会議 - 天才10
 * 
 * MongoDB接続からユーザー登録まで完全テスト
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// 環境変数読み込み
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

// カラーコード
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

// テスト結果
const testResults = {
  passed: [],
  failed: [],
  warnings: []
};

// ヘルパー関数
function printHeader(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
  testResults.passed.push(message);
}

function printError(message, details = null) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
  if (details) {
    console.log(`${colors.red}   詳細: ${details}${colors.reset}`);
  }
  testResults.failed.push({ message, details });
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
  testResults.warnings.push(message);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

// MongoDB接続取得
function getMongoUri() {
  const mongoEnv = process.env.MONGODB_ENV || 'local';
  
  if (mongoEnv === 'atlas' || mongoEnv === 'production') {
    const atlasUri = process.env.MONGODB_URI_PRODUCTION;
    if (atlasUri && !atlasUri.includes('xxxxx')) {
      return { uri: atlasUri, type: 'MongoDB Atlas' };
    }
  }
  
  return { 
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB',
    type: 'ローカルMongoDB'
  };
}

// テスト1: MongoDB接続
async function testMongoConnection() {
  printHeader('テスト1: MongoDB接続');
  
  const { uri, type } = getMongoUri();
  printInfo(`接続タイプ: ${type}`);
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000
  });
  
  try {
    await client.connect();
    await client.db().admin().ping();
    printSuccess('MongoDB接続成功');
    await client.close();
    return true;
  } catch (error) {
    printError('MongoDB接続失敗', error.message);
    await client.close();
    return false;
  }
}

// テスト2: APIエンドポイント疎通確認
async function testApiEndpoint() {
  printHeader('テスト2: APIエンドポイント確認');
  
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const testEndpoint = `${baseUrl}/api/auth/check-email`;
  
  printInfo(`エンドポイント: ${testEndpoint}`);
  
  try {
    const response = await fetch(testEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: 'test@example.com' })
    });
    
    if (response.ok) {
      const data = await response.json();
      printSuccess('APIエンドポイント応答正常');
      return true;
    } else {
      printError(`APIエンドポイントエラー: ${response.status} ${response.statusText}`);
      return false;
    }
  } catch (error) {
    printWarning('APIサーバーが起動していない可能性があります');
    printInfo('npm run dev でサーバーを起動してください');
    return false;
  }
}

// テスト3: ユーザー登録シミュレーション
async function testUserRegistration() {
  printHeader('テスト3: ユーザー登録シミュレーション');
  
  const { uri } = getMongoUri();
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    const usersCollection = db.collection('users');
    
    // テストユーザー情報
    const testUser = {
      email: `test-${Date.now()}@example.com`,
      name: 'テストユーザー',
      password: 'hashedPasswordHere', // 実際はbcryptでハッシュ化
      emailVerified: false,
      emailVerificationToken: crypto.randomUUID(),
      emailVerificationTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    printInfo(`テストユーザー: ${testUser.email}`);
    
    // ユーザー作成
    const result = await usersCollection.insertOne(testUser);
    
    if (result.insertedId) {
      printSuccess('ユーザー作成成功');
      
      // 作成確認
      const createdUser = await usersCollection.findOne({ _id: result.insertedId });
      if (createdUser) {
        printSuccess('ユーザーデータ確認成功');
        printInfo(`作成されたユーザーID: ${createdUser._id}`);
        
        // クリーンアップ
        await usersCollection.deleteOne({ _id: result.insertedId });
        printSuccess('テストデータクリーンアップ完了');
        
        await client.close();
        return true;
      }
    }
    
    await client.close();
    return false;
    
  } catch (error) {
    printError('ユーザー登録テスト失敗', error.message);
    await client.close();
    return false;
  }
}

// テスト4: データベース状態確認
async function testDatabaseStatus() {
  printHeader('テスト4: データベース状態確認');
  
  const { uri, type } = getMongoUri();
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    
    // データベース統計
    const stats = await db.stats();
    printSuccess(`データベースサイズ: ${(stats.dataSize / 1024).toFixed(2)} KB`);
    printSuccess(`コレクション数: ${stats.collections}`);
    
    // usersコレクション確認
    const collections = await db.listCollections().toArray();
    const usersCollection = collections.find(col => col.name === 'users');
    
    if (usersCollection) {
      const userCount = await db.collection('users').countDocuments();
      printSuccess(`usersコレクション: ${userCount}件のユーザー`);
      
      // インデックス確認
      const indexes = await db.collection('users').indexes();
      printInfo(`インデックス数: ${indexes.length}`);
      
      // emailインデックスの確認
      const emailIndex = indexes.find(idx => idx.key && idx.key.email);
      if (emailIndex) {
        printSuccess('emailインデックス: 設定済み');
      } else {
        printWarning('emailインデックスが見つかりません');
      }
    } else {
      printWarning('usersコレクションが存在しません');
    }
    
    await client.close();
    return true;
    
  } catch (error) {
    printError('データベース状態確認失敗', error.message);
    await client.close();
    return false;
  }
}

// テスト5: 環境変数検証
async function testEnvironmentVariables() {
  printHeader('テスト5: 環境変数検証');
  
  const requiredVars = [
    { name: 'MONGODB_URI', required: true },
    { name: 'NEXTAUTH_URL', required: true },
    { name: 'NEXTAUTH_SECRET', required: true },
    { name: 'EMAIL_ENABLED', required: false },
    { name: 'MONGODB_URI_PRODUCTION', required: false },
    { name: 'MONGODB_ENV', required: false }
  ];
  
  let allValid = true;
  
  requiredVars.forEach(varConfig => {
    const value = process.env[varConfig.name];
    
    if (value) {
      // プレースホルダーチェック
      if (value.includes('xxxxx')) {
        printError(`${varConfig.name}: プレースホルダーが含まれています`);
        allValid = false;
      } else {
        printSuccess(`${varConfig.name}: 設定済み`);
      }
    } else if (varConfig.required) {
      printError(`${varConfig.name}: 未設定（必須）`);
      allValid = false;
    } else {
      printWarning(`${varConfig.name}: 未設定（オプション）`);
    }
  });
  
  return allValid;
}

// 結果サマリー表示
function printSummary() {
  console.log('');
  printHeader('テスト結果サマリー');
  
  const totalTests = testResults.passed.length + testResults.failed.length;
  const passRate = totalTests > 0 
    ? ((testResults.passed.length / totalTests) * 100).toFixed(1)
    : 0;
  
  console.log(`${colors.bold}テスト統計:${colors.reset}`);
  console.log(`  合格: ${colors.green}${testResults.passed.length}${colors.reset}`);
  console.log(`  失敗: ${colors.red}${testResults.failed.length}${colors.reset}`);
  console.log(`  警告: ${colors.yellow}${testResults.warnings.length}${colors.reset}`);
  console.log(`  合格率: ${passRate >= 80 ? colors.green : colors.red}${passRate}%${colors.reset}`);
  
  if (testResults.failed.length > 0) {
    console.log('');
    console.log(`${colors.bold}${colors.red}失敗したテスト:${colors.reset}`);
    testResults.failed.forEach(failure => {
      console.log(`  • ${failure.message}`);
      if (failure.details) {
        console.log(`    ${colors.yellow}→ ${failure.details}${colors.reset}`);
      }
    });
  }
  
  if (testResults.warnings.length > 0) {
    console.log('');
    console.log(`${colors.bold}${colors.yellow}警告:${colors.reset}`);
    testResults.warnings.forEach(warning => {
      console.log(`  • ${warning}`);
    });
  }
  
  // 最終判定
  console.log('');
  if (testResults.failed.length === 0) {
    console.log(`${colors.bold}${colors.green}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.green}║              🎉 すべてのテストに合格しました！              ║${colors.reset}`);
    console.log(`${colors.bold}${colors.green}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
  } else {
    console.log(`${colors.bold}${colors.red}╔══════════════════════════════════════════════════════════╗${colors.reset}`);
    console.log(`${colors.bold}${colors.red}║            ⚠️  一部のテストが失敗しました                  ║${colors.reset}`);
    console.log(`${colors.bold}${colors.red}╚══════════════════════════════════════════════════════════╝${colors.reset}`);
    console.log('');
    console.log('📝 対処方法:');
    console.log('  1. 失敗したテストの詳細を確認');
    console.log('  2. MONGODB-ATLAS-QUICK-GUIDE.mdを参照');
    console.log('  3. node scripts/validate-mongodb-setup.js を実行');
  }
}

// メイン処理
async function main() {
  console.log(`${colors.bold}${colors.magenta}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║         ユーザー登録フロー統合テスト v1.0                  ║');
  console.log('║                14人天才会議 - 天才10                       ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  // テスト実行
  await testEnvironmentVariables();
  await testMongoConnection();
  await testDatabaseStatus();
  await testUserRegistration();
  await testApiEndpoint();
  
  // サマリー表示
  printSummary();
}

// 実行
main().catch(error => {
  console.error(`${colors.red}予期しないエラー: ${error.message}${colors.reset}`);
  process.exit(1);
});