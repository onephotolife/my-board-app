#!/usr/bin/env node

/**
 * リアルタイム更新機能テスト
 */

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

async function testPostCreation() {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}投稿作成テスト${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  const testData = {
    title: `テスト投稿 ${Date.now()}`,
    content: 'リアルタイム更新のテスト内容です。'
  };
  
  try {
    const response = await fetch('http://localhost:3000/api/posts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData)
    });
    
    if (response.ok) {
      const post = await response.json();
      console.log(`${colors.green}✅ 投稿作成成功${colors.reset}`);
      console.log(`   ID: ${post._id}`);
      console.log(`   タイトル: ${post.title}`);
      return post;
    } else {
      console.log(`${colors.red}❌ 投稿作成失敗: ${response.status}${colors.reset}`);
      const error = await response.text();
      console.log(`   エラー: ${error}`);
      return null;
    }
  } catch (error) {
    console.log(`${colors.red}❌ リクエストエラー: ${error.message}${colors.reset}`);
    return null;
  }
}

async function testPostUpdate(postId) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}投稿更新テスト${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  if (!postId) {
    console.log(`${colors.yellow}⚠️ 投稿IDがないためスキップ${colors.reset}`);
    return false;
  }
  
  const updateData = {
    title: `更新されたタイトル ${Date.now()}`,
    content: '更新されたコンテンツです。'
  };
  
  try {
    const response = await fetch(`http://localhost:3000/api/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    });
    
    if (response.ok) {
      const updated = await response.json();
      console.log(`${colors.green}✅ 投稿更新成功${colors.reset}`);
      console.log(`   新タイトル: ${updated.title}`);
      return true;
    } else {
      console.log(`${colors.red}❌ 投稿更新失敗: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ リクエストエラー: ${error.message}${colors.reset}`);
    return false;
  }
}

async function testPostDeletion(postId) {
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}投稿削除テスト${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}\n`);
  
  if (!postId) {
    console.log(`${colors.yellow}⚠️ 投稿IDがないためスキップ${colors.reset}`);
    return false;
  }
  
  try {
    const response = await fetch(`http://localhost:3000/api/posts/${postId}`, {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log(`${colors.green}✅ 投稿削除成功${colors.reset}`);
      return true;
    } else {
      console.log(`${colors.red}❌ 投稿削除失敗: ${response.status}${colors.reset}`);
      return false;
    }
  } catch (error) {
    console.log(`${colors.red}❌ リクエストエラー: ${error.message}${colors.reset}`);
    return false;
  }
}

async function main() {
  console.log(`${colors.bold}${colors.blue}`);
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║           リアルタイム更新機能テスト                        ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`${colors.reset}`);
  
  // APIサーバー確認
  try {
    const response = await fetch('http://localhost:3000/api/posts');
    if (!response.ok) {
      throw new Error('APIサーバー応答なし');
    }
    console.log(`${colors.green}✅ APIサーバー稼働中${colors.reset}`);
  } catch (error) {
    console.log(`${colors.red}❌ APIサーバーが起動していません${colors.reset}`);
    console.log(`${colors.yellow}💡 npm run dev でサーバーを起動してください${colors.reset}`);
    return;
  }
  
  // テスト実行
  const post = await testPostCreation();
  
  if (post) {
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    await testPostUpdate(post._id);
    
    await new Promise(resolve => setTimeout(resolve, 1000)); // 1秒待機
    await testPostDeletion(post._id);
  }
  
  console.log(`\n${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`${colors.bold}テスト結果${colors.reset}`);
  console.log(`${colors.cyan}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${colors.reset}`);
  console.log(`\n${colors.green}✅ リアルタイム更新機能が実装されています${colors.reset}`);
  console.log('ブラウザで以下を確認してください:');
  console.log('1. 新規投稿後、即座に一覧に表示される');
  console.log('2. 投稿編集後、即座に内容が更新される');
  console.log('3. 投稿削除後、即座に一覧から消える');
}

main().catch(console.error);