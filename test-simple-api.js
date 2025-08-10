#!/usr/bin/env node
/**
 * シンプルAPIテスト
 */

const http = require('http');

function makeRequest(body) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify(body);
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/register',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'X-Test-Mode': 'true'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        console.log('Status:', res.statusCode);
        console.log('Response:', data);
        resolve();
      });
    });

    req.on('error', (e) => {
      console.error('Error:', e.message);
      reject(e);
    });

    req.write(postData);
    req.end();
  });
}

// テスト実行
async function test() {
  console.log('Testing API...\n');
  
  await makeRequest({
    name: 'Test User',
    email: 'test' + Date.now() + '@example.com',
    password: 'Test123!Pass'
  });
}

test().catch(console.error);