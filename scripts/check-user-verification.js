#!/usr/bin/env node

/**
 * ユーザーのメール確認状態をチェック
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

// 環境変数読み込み
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

async function checkUsers() {
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    console.log(`${colors.green}✅ MongoDB Atlas接続成功${colors.reset}\n`);
    
    const db = client.db('boardDB');
    const users = await db.collection('users').find({}).toArray();
    
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
    console.log(`${colors.bold}ユーザー一覧（emailVerified状態）${colors.reset}`);
    console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}\n`);
    
    if (users.length === 0) {
      console.log(`${colors.yellow}ユーザーが登録されていません${colors.reset}`);
    } else {
      users.forEach((user, index) => {
        const verified = user.emailVerified === true ? '✅' : '❌';
        const verifiedColor = user.emailVerified === true ? colors.green : colors.red;
        
        console.log(`${colors.bold}[${index + 1}] ${user.email}${colors.reset}`);
        console.log(`   ID: ${user._id}`);
        console.log(`   名前: ${user.name}`);
        console.log(`   ${verifiedColor}メール確認: ${verified} (${user.emailVerified})${colors.reset}`);
        console.log(`   登録日: ${user.createdAt}`);
        
        if (user.emailVerificationToken) {
          console.log(`   ${colors.yellow}⚠️ 確認トークン: あり${colors.reset}`);
        }
        console.log('');
      });
      
      // 統計
      const verifiedCount = users.filter(u => u.emailVerified === true).length;
      const unverifiedCount = users.length - verifiedCount;
      
      console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
      console.log(`${colors.bold}統計${colors.reset}`);
      console.log(`${colors.cyan}${'='.repeat(80)}${colors.reset}`);
      console.log(`総ユーザー数: ${users.length}`);
      console.log(`${colors.green}確認済み: ${verifiedCount}${colors.reset}`);
      console.log(`${colors.red}未確認: ${unverifiedCount}${colors.reset}`);
    }
    
    await client.close();
    
  } catch (error) {
    console.error(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    await client.close();
  }
}

// 特定のメールアドレスを確認済みにする機能
async function verifyUserByEmail(email) {
  if (!email) {
    console.log(`${colors.yellow}使用方法: node scripts/check-user-verification.js [メールアドレス]${colors.reset}`);
    return;
  }
  
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  try {
    await client.connect();
    
    const db = client.db('boardDB');
    const result = await db.collection('users').updateOne(
      { email: email },
      { 
        $set: { 
          emailVerified: true,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null
        }
      }
    );
    
    if (result.matchedCount > 0) {
      console.log(`${colors.green}✅ ${email} のメール確認を完了しました${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ ${email} が見つかりません${colors.reset}`);
    }
    
    await client.close();
    
  } catch (error) {
    console.error(`${colors.red}❌ エラー: ${error.message}${colors.reset}`);
    await client.close();
  }
}

// メイン処理
const args = process.argv.slice(2);
if (args.length > 0 && args[0].includes('@')) {
  // メールアドレスが指定された場合は確認済みにする
  verifyUserByEmail(args[0]);
} else {
  // 通常のユーザー一覧表示
  checkUsers();
}