#!/usr/bin/env node

/**
 * 重要なメール再送信テストのみを実行
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// HTTPリクエストヘルパー
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
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });
    req.write(data);
    req.end();
  });
}

async function testBasicFlow() {
  console.log('🧪 基本フローテスト');
  
  const email = `test${Math.floor(Math.random() * 10) + 1}@example.com`;
  const data = JSON.stringify({ email, reason: 'not_received' });
  
  try {
    const response = await makeRequest(`${BASE_URL}/api/auth/resend`, data);
    
    if (response.status === 200 && response.data?.success) {
      console.log('✅ 基本フロー: OK');
      return true;
    } else {
      console.log('❌ 基本フロー: NG', response.status);
      return false;
    }
  } catch (error) {
    console.log('❌ 基本フロー: エラー', error.message);
    return false;
  }
}

async function testValidation() {
  console.log('🧪 入力検証テスト');
  
  const invalidEmails = [
    { email: '', reason: 'not_received' },
    { email: 'invalid', reason: 'not_received' },
    { email: 'test@test@test.com', reason: 'not_received' },
    { email: 'test<script>alert(1)</script>@example.com', reason: 'not_received' }
  ];
  
  let passed = 0;
  for (const testData of invalidEmails) {
    try {
      const response = await makeRequest(
        `${BASE_URL}/api/auth/resend`,
        JSON.stringify(testData)
      );
      
      if (response.status === 400) {
        passed++;
      }
    } catch (error) {
      // タイムアウトは失敗とする
    }
  }
  
  if (passed === invalidEmails.length) {
    console.log('✅ 入力検証: OK');
    return true;
  } else {
    console.log(`❌ 入力検証: ${passed}/${invalidEmails.length} passed`);
    return false;
  }
}

async function testAttemptNumber() {
  console.log('🧪 attemptNumberフィールドテスト');
  
  const email = `test${Math.floor(Math.random() * 10) + 1}@example.com`;
  
  try {
    // 初回リクエスト
    const response1 = await makeRequest(
      `${BASE_URL}/api/auth/resend`,
      JSON.stringify({ email, reason: 'not_received' })
    );
    
    if (response1.data?.data?.attemptNumber >= 1) {
      console.log('✅ attemptNumber: OK');
      return true;
    } else {
      console.log('❌ attemptNumber: NG', response1.data?.data);
      return false;
    }
  } catch (error) {
    console.log('❌ attemptNumber: エラー', error.message);
    return false;
  }
}

async function main() {
  console.log('======================================');
  console.log('🚀 重要テストのみ実行');
  console.log('======================================\n');
  
  const results = [];
  
  // 各テストを実行
  results.push(await testBasicFlow());
  results.push(await testValidation());
  results.push(await testAttemptNumber());
  
  // 結果集計
  const passed = results.filter(r => r).length;
  const total = results.length;
  const rate = ((passed / total) * 100).toFixed(1);
  
  console.log('\n======================================');
  console.log('📊 結果サマリー');
  console.log('======================================');
  console.log(`成功: ${passed}/${total} (${rate}%)`);
  
  if (rate === '100.0') {
    console.log('🎉 全テスト合格！');
  } else {
    console.log('⚠️ 一部テスト失敗');
  }
  
  process.exit(passed === total ? 0 : 1);
}

main().catch(console.error);