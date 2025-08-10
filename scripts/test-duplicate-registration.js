#!/usr/bin/env node

/**
 * 重複登録テスト詳細診断
 */

const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');
const path = require('path');

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

async function testDuplicateFlow() {
  console.log(`${colors.bold}${colors.cyan}重複登録診断ツール${colors.reset}\n`);
  
  const testEmail = `duplicate-test-${Date.now()}@example.com`;
  const client = new MongoClient(process.env.MONGODB_URI);
  
  try {
    // 1. 初回登録
    console.log(`${colors.blue}1. 初回登録テスト${colors.reset}`);
    console.log(`   Email: ${testEmail}`);
    
    const firstResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Test123456!',
        name: 'First User'
      })
    });
    
    const firstResult = await firstResponse.json();
    console.log(`   結果: ${firstResponse.ok ? '✅ 成功' : '❌ 失敗'}`);
    console.log(`   レスポンス:`, firstResult);
    
    if (!firstResponse.ok) {
      console.log(`${colors.red}初回登録に失敗しました${colors.reset}`);
      return;
    }
    
    // 2. MongoDB確認
    console.log(`\n${colors.blue}2. MongoDB確認${colors.reset}`);
    await client.connect();
    const user = await client.db('boardDB').collection('users').findOne({ email: testEmail });
    console.log(`   ユーザー存在: ${user ? '✅' : '❌'}`);
    if (user) {
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
    }
    
    // 3. 重複登録試行
    console.log(`\n${colors.blue}3. 重複登録試行${colors.reset}`);
    
    const duplicateResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: testEmail,
        password: 'Different123!',
        name: 'Duplicate User'
      })
    });
    
    const duplicateResult = await duplicateResponse.json();
    console.log(`   HTTPステータス: ${duplicateResponse.status}`);
    console.log(`   期待: 400 (Bad Request)`);
    console.log(`   結果: ${duplicateResponse.status === 400 ? '✅ 正常' : '❌ 異常'}`);
    console.log(`   レスポンス:`, duplicateResult);
    
    // 4. 大文字小文字変更試行
    console.log(`\n${colors.blue}4. 大文字小文字変更試行${colors.reset}`);
    const upperEmail = testEmail.toUpperCase();
    console.log(`   Email: ${upperEmail}`);
    
    const upperResponse = await fetch('http://localhost:3000/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: upperEmail,
        password: 'Upper123!',
        name: 'Upper User'
      })
    });
    
    const upperResult = await upperResponse.json();
    console.log(`   結果: ${upperResponse.status === 400 ? '✅ 拒否（正常）' : '❌ 許可（異常）'}`);
    console.log(`   レスポンス:`, upperResult);
    
    // 5. データベース状態確認
    console.log(`\n${colors.blue}5. 最終データベース状態${colors.reset}`);
    const allUsers = await client.db('boardDB').collection('users').find({
      email: { $regex: new RegExp(testEmail, 'i') }
    }).toArray();
    
    console.log(`   該当ユーザー数: ${allUsers.length}`);
    console.log(`   期待値: 1`);
    console.log(`   結果: ${allUsers.length === 1 ? '✅ 正常' : '❌ 異常'}`);
    
    // クリーンアップ
    const deleteResult = await client.db('boardDB').collection('users').deleteMany({
      email: { $regex: new RegExp(testEmail, 'i') }
    });
    console.log(`\n${colors.cyan}クリーンアップ: ${deleteResult.deletedCount}件削除${colors.reset}`);
    
    await client.close();
    
    // 最終判定
    console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
    if (duplicateResponse.status === 400 && upperResponse.status === 400 && allUsers.length === 1) {
      console.log(`${colors.green}✅ 重複登録チェック: 正常動作${colors.reset}`);
    } else {
      console.log(`${colors.red}❌ 重複登録チェック: 問題あり${colors.reset}`);
    }
    
  } catch (error) {
    console.error(`${colors.red}エラー: ${error.message}${colors.reset}`);
    await client.close();
  }
}

testDuplicateFlow().catch(console.error);