#!/usr/bin/env node

/**
 * ログインフローテストスクリプト
 */

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

async function testSignIn(email, password) {
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}ログインテスト${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  console.log(`${colors.blue}📧 Email: ${email}${colors.reset}`);
  console.log(`${colors.blue}🔑 Password: ${'*'.repeat(password.length)}${colors.reset}\n`);
  
  try {
    // NextAuthのsignInエンドポイントにリクエスト
    const response = await fetch('http://localhost:3000/api/auth/signin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: email,
        password: password,
        json: 'true',
        redirect: 'false',
        callbackUrl: 'http://localhost:3000'
      })
    });
    
    const text = await response.text();
    console.log(`${colors.yellow}レスポンス:${colors.reset}`);
    console.log(text);
    
    // JSONパース試行
    try {
      const data = JSON.parse(text);
      
      if (data.error) {
        console.log(`${colors.red}❌ ログイン失敗: ${data.error}${colors.reset}`);
        
        if (data.error === 'EmailNotVerified') {
          console.log(`${colors.yellow}📧 メールアドレスが未確認です${colors.reset}`);
        } else if (data.error === 'CredentialsSignin') {
          console.log(`${colors.yellow}🔑 メールアドレスまたはパスワードが間違っています${colors.reset}`);
        }
      } else if (data.ok) {
        console.log(`${colors.green}✅ ログイン成功！${colors.reset}`);
        if (data.url) {
          console.log(`${colors.blue}🔗 リダイレクト先: ${data.url}${colors.reset}`);
        }
      }
    } catch (e) {
      console.log(`${colors.yellow}⚠️ レスポンスがJSONではありません${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}❌ リクエストエラー: ${error.message}${colors.reset}`);
    console.log(`\n${colors.yellow}💡 ヒント:${colors.reset}`);
    console.log('1. 開発サーバーが起動していることを確認: npm run dev');
    console.log('2. http://localhost:3000 でアクセス可能か確認');
  }
}

// MongoDB直接チェック
async function checkUserInDB(email) {
  const { MongoClient } = require('mongodb');
  const uri = process.env.MONGODB_URI;
  const client = new MongoClient(uri);
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}MongoDB ユーザー確認${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    const user = await db.collection('users').findOne({ email: email });
    
    if (user) {
      console.log(`${colors.green}✅ ユーザー発見:${colors.reset}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   名前: ${user.name}`);
      console.log(`   メール確認: ${user.emailVerified === true ? '✅ 確認済み' : '❌ 未確認'}`);
      console.log(`   パスワード: ${user.password ? '設定済み' : '未設定'}`);
      
      if (!user.emailVerified) {
        console.log(`\n${colors.yellow}⚠️ メールが未確認のため、ログインできません${colors.reset}`);
      }
    } else {
      console.log(`${colors.red}❌ ユーザーが見つかりません${colors.reset}`);
    }
    
    await client.close();
  } catch (error) {
    console.error(`${colors.red}❌ DBエラー: ${error.message}${colors.reset}`);
    await client.close();
  }
}

// パスワードハッシュテスト
async function testPasswordHash(plainPassword, hashedPassword) {
  const bcrypt = require('bcryptjs');
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}パスワードハッシュ検証${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  const isMatch = await bcrypt.compare(plainPassword, hashedPassword);
  
  if (isMatch) {
    console.log(`${colors.green}✅ パスワードが一致します${colors.reset}`);
  } else {
    console.log(`${colors.red}❌ パスワードが一致しません${colors.reset}`);
  }
  
  return isMatch;
}

// メイン処理
async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║             ログインフロー診断ツール                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  // コマンドライン引数からメールとパスワードを取得
  const args = process.argv.slice(2);
  const email = args[0] || 'one.photolife+29@gmail.com';
  const password = args[1] || 'ya12345678';
  
  // 1. MongoDB確認
  await checkUserInDB(email);
  
  // 2. ログインテスト
  await testSignIn(email, password);
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}推奨アクション${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log('1. メール未確認の場合: 確認メールのリンクをクリック');
  console.log('2. パスワードが間違っている場合: 正しいパスワードを入力');
  console.log('3. ユーザーが存在しない場合: 新規登録を実行');
  
  console.log(`\n使用方法: node scripts/test-login-flow.js [email] [password]`);
}

main().catch(console.error);