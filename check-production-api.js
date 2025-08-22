#!/usr/bin/env node

/**
 * 本番環境APIレスポンス確認
 */

const production_url = 'https://board.blankbrainai.com';

async function checkProductionAPI() {
  console.log('🔍 本番環境API確認開始');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  try {
    // 投稿一覧を取得
    const response = await fetch(`${production_url}/api/posts?page=1&limit=10`);
    
    console.log(`📡 HTTPステータス: ${response.status}`);
    console.log(`📍 URL: ${response.url}`);
    
    const text = await response.text();
    console.log(`📝 レスポンス長: ${text.length}文字`);
    
    let data;
    try {
      data = JSON.parse(text);
    } catch (e) {
      console.log('❌ JSONパースエラー');
      console.log('生のレスポンス:', text.substring(0, 500));
      return;
    }
    
    console.log(`📦 データ構造: ${Object.keys(data).join(', ')}`);
    
    if (!data.posts) {
      console.log('❌ postsフィールドが存在しません');
      console.log('実際のデータ:', JSON.stringify(data, null, 2));
      return;
    }
    
    console.log(`📊 取得した投稿数: ${data.posts.length}件`);
    console.log('');
    
    // 各投稿のタグを確認
    let tagsFound = false;
    data.posts.forEach((post, index) => {
      console.log(`投稿 ${index + 1}:`);
      console.log(`  ID: ${post._id}`);
      console.log(`  内容: ${post.content ? post.content.substring(0, 50) : 'なし'}...`);
      console.log(`  タグ: ${post.tags ? JSON.stringify(post.tags) : 'なし'}`);
      
      if (post.tags && post.tags.length > 0) {
        tagsFound = true;
      }
      console.log('');
    });
    
    if (tagsFound) {
      console.log('✅ APIレスポンスにタグが含まれています');
    } else {
      console.log('❌ APIレスポンスにタグが含まれていません');
    }
    
    // 生のレスポンスも確認
    if (data.posts && data.posts.length > 0) {
      console.log('\n📋 最初の投稿の生データ:');
      console.log(JSON.stringify(data.posts[0], null, 2));
    }
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error.stack);
  }
}

checkProductionAPI();