#!/usr/bin/env node

/**
 * テストユーザーの投稿診断スクリプト
 */

import { chromium } from 'playwright';
import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';
const production_url = 'https://board.blankbrainai.com';
const credentials = {
  email: 'one.photolife+2@gmail.com',
  password: '?@thc123THC@?'
};

async function diagnoseTestUser() {
  console.log('🔍 テストユーザー投稿診断');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // MongoDB接続
  const client = new MongoClient(MONGODB_URI);
  
  try {
    await client.connect();
    const db = client.db('boardDB');
    
    // すべてのコレクションを確認
    const collections = await db.listCollections().toArray();
    console.log('\n📦 利用可能なコレクション:');
    collections.forEach(col => {
      console.log(`  - ${col.name}`);
    });
    
    // postsコレクションの全投稿を表示
    const postsCollection = db.collection('posts');
    const allPosts = await postsCollection.find({}).toArray();
    console.log(`\n📊 postsコレクション総数: ${allPosts.length}件`);
    
    // 最初の3件のIDを表示
    console.log('\n最初の3投稿のID:');
    allPosts.slice(0, 3).forEach((post, i) => {
      console.log(`  ${i+1}. ${post._id} - ${post.title}`);
    });
    
  } catch (error) {
    console.error('MongoDB エラー:', error.message);
  } finally {
    await client.close();
  }
  
  // Playwrightでテストユーザーの投稿を確認
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // ログイン
    console.log('\n🔐 テストユーザーでログイン中...');
    await page.goto(`${production_url}/auth/signin`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', credentials.email);
    await page.fill('input[type="password"]', credentials.password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    console.log('✅ ログイン成功');
    
    let apiResponse = null;
    
    // APIレスポンスをインターセプト
    page.on('response', async (response) => {
      if (response.url().includes('/api/posts') && response.status() === 200) {
        try {
          apiResponse = await response.json();
        } catch (e) {
          // ignore
        }
      }
    });
    
    // 掲示板ページへ遷移
    await page.goto(`${production_url}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(3000);
    
    if (apiResponse) {
      console.log('\n📡 APIレスポンス分析:');
      const posts = apiResponse.data || apiResponse.posts || [];
      console.log(`  投稿数: ${posts.length}件`);
      
      if (posts.length > 0) {
        console.log('\n表示される投稿:');
        posts.forEach((post, i) => {
          console.log(`\n  投稿 ${i+1}:`);
          console.log(`    ID: ${post._id}`);
          console.log(`    タイトル: ${post.title}`);
          console.log(`    内容: ${post.content}`);
          console.log(`    タグ: ${JSON.stringify(post.tags)}`);
          console.log(`    作成者: ${post.author ? post.author.email : '不明'}`);
        });
        
        // これらのIDが本番DBに存在するか確認
        console.log('\n\n🔍 投稿IDの存在確認:');
        const client2 = new MongoClient(MONGODB_URI);
        await client2.connect();
        const db2 = client2.db('boardDB');
        const postsCollection2 = db2.collection('posts');
        
        for (const post of posts) {
          try {
            const dbPost = await postsCollection2.findOne({ _id: new ObjectId(post._id) });
            if (dbPost) {
              console.log(`  ✅ ${post._id}: 存在する (タグ: ${JSON.stringify(dbPost.tags)})`);
            } else {
              // 文字列IDとして試す
              const dbPost2 = await postsCollection2.findOne({ _id: post._id });
              if (dbPost2) {
                console.log(`  ✅ ${post._id}: 存在する（文字列ID） (タグ: ${JSON.stringify(dbPost2.tags)})`);
              } else {
                console.log(`  ❌ ${post._id}: 存在しない`);
              }
            }
          } catch (e) {
            console.log(`  ❌ ${post._id}: エラー - ${e.message}`);
          }
        }
        
        await client2.close();
      }
    } else {
      console.log('⚠️ APIレスポンスを取得できませんでした');
    }
    
    // DOM要素も確認
    const postCards = await page.locator('[data-testid^="post-card-"]').count();
    console.log(`\n🎯 DOM上の投稿カード数: ${postCards}`);
    
    const tagChips = await page.locator('.MuiChip-root').filter({ hasText: '#' }).count();
    console.log(`🏷️ DOM上のタグチップ数: ${tagChips}`);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await browser.close();
  }
  
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('診断完了');
}

// 実行
diagnoseTestUser();