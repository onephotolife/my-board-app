#!/usr/bin/env node

/**
 * MongoDB接続検証スクリプト
 * 14人天才会議 - 天才5
 * 
 * このスクリプトは、MongoDB接続設定を詳細に検証し、
 * 問題がある場合は具体的な解決方法を提示します。
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// 環境変数を読み込み
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
  console.log('📁 .env.localファイルを読み込みました\n');
} else {
  console.error('❌ .env.localファイルが見つかりません');
  process.exit(1);
}

// カラーコード
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bold: '\x1b[1m'
};

// ヘルパー関数
function printSection(title) {
  console.log(`\n${colors.bold}${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}${colors.cyan}${title}${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
}

function printSuccess(message) {
  console.log(`${colors.green}✅ ${message}${colors.reset}`);
}

function printError(message) {
  console.log(`${colors.red}❌ ${message}${colors.reset}`);
}

function printWarning(message) {
  console.log(`${colors.yellow}⚠️  ${message}${colors.reset}`);
}

function printInfo(message) {
  console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
}

// URI検証関数
function validateUri(uri, type) {
  const issues = [];
  
  if (!uri) {
    issues.push(`${type} URIが設定されていません`);
    return issues;
  }
  
  // プレースホルダーチェック
  if (uri.includes('xxxxx')) {
    issues.push(`URIにプレースホルダー "xxxxx" が含まれています`);
    issues.push(`修正方法:`);
    issues.push(`  1. MongoDB Atlasダッシュボードにログイン`);
    issues.push(`  2. Database > Connect をクリック`);
    issues.push(`  3. "Connect your application"を選択`);
    issues.push(`  4. 実際のクラスター名を確認（例: cluster0.abcde.mongodb.net）`);
    issues.push(`  5. .env.localの${type}を更新`);
  }
  
  if (uri.includes('username:password')) {
    issues.push(`URIにプレースホルダー認証情報が含まれています`);
    issues.push(`修正方法: 実際のユーザー名とパスワードに置き換えてください`);
  }
  
  if (uri.includes('mongodb+srv://') && !uri.includes('@')) {
    issues.push(`URIの形式が不正です（@マークが見つかりません）`);
  }
  
  return issues;
}

// MongoDB接続テスト
async function testConnection(uri, label) {
  printSection(`${label} 接続テスト`);
  
  // URI検証
  const issues = validateUri(uri, label);
  if (issues.length > 0) {
    printError(`URI検証に失敗しました:`);
    issues.forEach(issue => console.log(`  ${colors.yellow}→ ${issue}${colors.reset}`));
    return false;
  }
  
  // URIの一部を隠して表示
  const maskedUri = uri.replace(/\/\/[^@]+@/, '//***@').substring(0, 80);
  printInfo(`接続先: ${maskedUri}...`);
  
  const client = new MongoClient(uri, {
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 5000
  });
  
  try {
    console.log(`${colors.cyan}接続を試みています...${colors.reset}`);
    await client.connect();
    
    // 接続成功
    printSuccess('接続に成功しました！');
    
    // データベース情報を取得
    const admin = client.db().admin();
    const result = await admin.ping();
    printSuccess(`サーバーからの応答: ${JSON.stringify(result)}`);
    
    // データベース一覧
    const databases = await admin.listDatabases();
    printInfo(`利用可能なデータベース数: ${databases.databases.length}`);
    
    // boardDBの存在確認
    const boardDB = databases.databases.find(db => db.name === 'boardDB');
    if (boardDB) {
      printSuccess(`boardDBが存在します (サイズ: ${(boardDB.sizeOnDisk / 1024 / 1024).toFixed(2)} MB)`);
      
      // コレクション情報
      const db = client.db('boardDB');
      const collections = await db.listCollections().toArray();
      printInfo(`コレクション数: ${collections.length}`);
      
      // usersコレクションの確認
      const usersCollection = collections.find(col => col.name === 'users');
      if (usersCollection) {
        const userCount = await db.collection('users').countDocuments();
        printSuccess(`usersコレクション: ${userCount}件のドキュメント`);
      }
    } else {
      printWarning('boardDBがまだ作成されていません（初回登録時に自動作成されます）');
    }
    
    await client.close();
    return true;
    
  } catch (error) {
    printError(`接続に失敗しました: ${error.message}`);
    
    // エラーに応じた解決策を提示
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n📝 解決方法:');
      console.log('  1. MongoDBが起動していることを確認');
      console.log('     brew services start mongodb-community');
      console.log('  2. ポート27017が使用可能か確認');
      console.log('     lsof -i :27017');
    } else if (error.message.includes('authentication failed')) {
      console.log('\n📝 解決方法:');
      console.log('  1. MongoDB Atlasのユーザー名とパスワードを確認');
      console.log('  2. Database Access でユーザーの権限を確認');
      console.log('  3. パスワードに特殊文字が含まれる場合はURLエンコードが必要');
    } else if (error.message.includes('Network')) {
      console.log('\n📝 解決方法:');
      console.log('  1. MongoDB AtlasのNetwork Accessを確認');
      console.log('  2. 現在のIPアドレスが許可されているか確認');
      console.log('  3. 開発環境では 0.0.0.0/0 を許可することを推奨');
    }
    
    await client.close();
    return false;
  }
}

// メイン処理
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           MongoDB 接続設定検証ツール v2.0                 ║');
  console.log('║                14人天才会議 - 天才5                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  // 環境変数の確認
  printSection('環境変数の確認');
  
  const mongoUri = process.env.MONGODB_URI;
  const mongoUriProduction = process.env.MONGODB_URI_PRODUCTION;
  const mongoEnv = process.env.MONGODB_ENV;
  
  printInfo(`MONGODB_ENV: ${mongoEnv || '未設定（デフォルト: local）'}`);
  printInfo(`MONGODB_URI: ${mongoUri ? '設定済み' : '未設定'}`);
  printInfo(`MONGODB_URI_PRODUCTION: ${mongoUriProduction ? '設定済み' : '未設定'}`);
  
  // 接続先の決定
  let targetUri;
  let connectionType;
  
  if (mongoEnv === 'atlas' || mongoEnv === 'production') {
    if (mongoUriProduction && !mongoUriProduction.includes('xxxxx')) {
      targetUri = mongoUriProduction;
      connectionType = 'MongoDB Atlas（本番環境）';
    } else if (mongoUri) {
      printWarning('MongoDB Atlas URIが無効なため、ローカルMongoDBにフォールバック');
      targetUri = mongoUri;
      connectionType = 'ローカルMongoDB（フォールバック）';
    }
  } else {
    targetUri = mongoUri || 'mongodb://localhost:27017/boardDB';
    connectionType = 'ローカルMongoDB';
  }
  
  printSection('接続先の決定');
  printInfo(`接続タイプ: ${connectionType}`);
  
  // 接続テスト実行
  if (targetUri) {
    const success = await testConnection(targetUri, connectionType);
    
    // 結果サマリー
    printSection('検証結果サマリー');
    
    if (success) {
      printSuccess('MongoDB接続が正常に動作しています！');
      console.log('\n✨ アプリケーションを起動できます:');
      console.log(`   ${colors.cyan}npm run dev${colors.reset}`);
    } else {
      printError('MongoDB接続に問題があります');
      console.log('\n📚 詳細なセットアップガイド:');
      console.log('   MONGODB_ATLAS_SETUP.md を参照してください');
    }
  } else {
    printError('有効なMongoDB URIが見つかりません');
    console.log('\n📝 .env.localファイルに以下を設定してください:');
    console.log('   MONGODB_URI=mongodb://localhost:27017/boardDB');
  }
  
  // MongoDB Atlas移行の提案
  if (!mongoUriProduction || mongoUriProduction.includes('xxxxx')) {
    printSection('MongoDB Atlas移行のご提案');
    console.log('🌐 MongoDB Atlasを使用すると以下のメリットがあります:');
    console.log('  • クラウドベースで管理不要');
    console.log('  • 自動バックアップ');
    console.log('  • 無料プラン（512MB）');
    console.log('  • グローバルアクセス可能');
    console.log('\n📖 セットアップガイド: MONGODB_ATLAS_SETUP.md');
  }
}

// 実行
main().catch(console.error);