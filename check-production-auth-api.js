#!/usr/bin/env node

/**
 * 本番環境API認証付き確認
 */

const { chromium } = require('playwright');

const production_url = 'https://board.blankbrainai.com';
const credentials = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

async function checkAuthenticatedAPI() {
  console.log('🔍 認証付き本番環境API確認');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // ログイン
    console.log('🔐 ログイン処理開始...');
    await page.goto(`${production_url}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    console.log('✅ ログイン成功');
    
    // クッキーを取得
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'authjs.session-token' || c.name === 'next-auth.session-token');
    
    if (sessionCookie) {
      console.log(`🍪 セッショントークン取得: ${sessionCookie.name}`);
    }
    
    // APIリクエストをインターセプト
    page.on('response', async (response) => {
      if (response.url().includes('/api/posts')) {
        console.log(`\n🔍 APIコール検出: ${response.url()}`);
        console.log(`  ステータス: ${response.status()}`);
        
        if (response.status() === 200) {
          try {
            const data = await response.json();
            console.log('\n📡 APIレスポンス詳細:');
            console.log(`  URL: ${response.url()}`);
            console.log(`  投稿数: ${data.posts ? data.posts.length : 0}`);
          
          if (data.posts && data.posts.length > 0) {
            console.log('\n📋 投稿データ分析:');
            let tagsFound = false;
            
            data.posts.slice(0, 3).forEach((post, index) => {
              console.log(`\n投稿 ${index + 1}:`);
              console.log(`  ID: ${post._id}`);
              console.log(`  内容: ${post.content ? post.content.substring(0, 60) : 'なし'}...`);
              console.log(`  タグ: ${post.tags ? JSON.stringify(post.tags) : 'なし'}`);
              console.log(`  作成日: ${post.createdAt}`);
              
              if (post.tags && post.tags.length > 0) {
                tagsFound = true;
              }
            });
            
            console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            if (tagsFound) {
              console.log('✅ APIレスポンスにタグが含まれています！');
            } else {
              console.log('❌ APIレスポンスにタグが含まれていません');
            }
            
            // 最初の投稿の詳細
            console.log('\n📊 最初の投稿の全フィールド:');
            console.log(JSON.stringify(data.posts[0], null, 2));
          } else {
            console.log('\n⚠️ 投稿が0件です。全データ:');
            console.log(JSON.stringify(data, null, 2));
          }
          } catch (e) {
            console.error('レスポンス解析エラー:', e.message);
          }
        }
      }
    });
    
    // 掲示板ページへ遷移してAPIコールをトリガー
    console.log('\n📍 掲示板ページへ遷移...');
    await page.goto(`${production_url}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    // ページ上のDOM要素も確認
    const postCards = await page.locator('[data-testid^="post-card-"]').count();
    console.log(`\n🎯 DOM上の投稿カード数: ${postCards}`);
    
    // タグ要素の存在確認
    const tagChips = await page.locator('.MuiChip-root').filter({ hasText: '#' }).count();
    console.log(`🏷️ DOM上のタグチップ数: ${tagChips}`);
    
    if (tagChips === 0) {
      // HTMLの一部を出力してデバッグ
      const firstPost = await page.locator('[data-testid^="post-card-"]').first();
      if (await firstPost.count() > 0) {
        const html = await firstPost.innerHTML();
        console.log('\n📝 最初の投稿のHTML構造（抜粋）:');
        console.log(html.substring(0, 500));
      }
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
}

checkAuthenticatedAPI();