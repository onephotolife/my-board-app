#!/usr/bin/env node

/**
 * 最大試行回数制限のテスト専用スクリプト
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// HTTP/HTTPS リクエストヘルパー
function makeRequest(url, data) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        'User-Agent': 'Mozilla/5.0 (Test Script) ResendTest/1.0'
      }
    };
    
    const req = client.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testMaxAttempts() {
  console.log('🔬 最大試行回数制限テスト開始\n');
  
  // 固定メールアドレスを使用
  const email = 'test1@example.com';
  console.log(`📧 テストメール: ${email}\n`);
  
  let maxAttemptsReached = false;
  
  for (let i = 1; i <= 7; i++) {
    console.log(`\n=== 試行 ${i} ===`);
    
    try {
      const data = JSON.stringify({ 
        email, 
        reason: 'not_received' 
      });
      
      const response = await makeRequest(
        `${BASE_URL}/api/auth/resend`,
        data
      );
      
      console.log(`📊 ステータス: ${response.status}`);
      console.log(`📋 レスポンス:`, JSON.stringify(response.data, null, 2));
      
      if (response.status === 429) {
        const errorCode = response.data?.error?.code;
        console.log(`⚠️ エラーコード: ${errorCode}`);
        
        if (errorCode === 'MAX_ATTEMPTS_EXCEEDED') {
          console.log(`✅ 最大試行回数制限に達しました！（${i}回目）`);
          maxAttemptsReached = true;
          break;
        } else if (errorCode === 'RATE_LIMITED') {
          const cooldown = response.data?.error?.details?.cooldownSeconds || 1;
          console.log(`⏱️ レート制限: ${cooldown}秒待機`);
          await new Promise(resolve => setTimeout(resolve, cooldown * 1000 + 100));
        }
      }
      
      // 少し待機
      await new Promise(resolve => setTimeout(resolve, 200));
      
    } catch (error) {
      console.error(`❌ エラー: ${error.message}`);
    }
  }
  
  console.log('\n=== 結果 ===');
  if (maxAttemptsReached) {
    console.log('✅ テスト成功: 最大試行回数制限が正常に動作しています');
  } else {
    console.log('❌ テスト失敗: 最大試行回数制限が動作していません');
  }
}

// データベース状態を確認
async function checkDatabase() {
  const { MongoClient } = require('mongodb');
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  const client = new MongoClient(mongoUri);
  
  try {
    await client.connect();
    const db = client.db();
    
    // test1@example.comのユーザーを確認
    const user = await db.collection('users').findOne({ email: 'test1@example.com' });
    if (!user) {
      console.log('❌ test1@example.comユーザーが存在しません');
      return false;
    }
    console.log('✅ ユーザー確認:', { 
      email: user.email, 
      id: user._id,
      emailVerified: user.emailVerified 
    });
    
    // ResendHistoryを確認
    const history = await db.collection('resendhistories').findOne({ userId: user._id });
    if (history) {
      console.log('📊 ResendHistory:', {
        userId: history.userId,
        attempts: history.attempts?.length || 0,
        totalAttempts: history.totalAttempts
      });
    } else {
      console.log('ℹ️ ResendHistoryがまだ存在しません');
    }
    
    return true;
  } finally {
    await client.close();
  }
}

// メイン実行
async function main() {
  console.log('📊 データベース状態確認...\n');
  const userExists = await checkDatabase();
  
  if (!userExists) {
    console.log('\n⚠️ テストユーザーを作成してください:');
    console.log('node scripts/create-test-users.js');
    process.exit(1);
  }
  
  console.log('\n');
  await testMaxAttempts();
  
  console.log('\n📊 テスト後のデータベース状態...\n');
  await checkDatabase();
}

main().catch(console.error);