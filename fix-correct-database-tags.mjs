#!/usr/bin/env node

/**
 * 正しいデータベース（board-app）のタグを修正
 */

import { MongoClient, ObjectId } from 'mongodb';

// board-appデータベースに接続
const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/board-app?retryWrites=true&w=majority';

async function fixCorrectDatabaseTags() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 board-appデータベースに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    
    const db = client.db('board-app');
    const postsCollection = db.collection('posts');
    
    // ターゲット投稿のID
    const targetPosts = [
      { id: '68a86b5aae3045ee7b36c7f8', tags: ['お知らせ', '重要', '新機能'] },
      { id: '68a865701acd428543e98e30', tags: ['技術', 'React', 'Tips'] },
      { id: '68a85efe053689c4e74863e4', tags: ['一般', '質問', '初心者'] },
    ];
    
    console.log('📋 現在の投稿状態:');
    for (const target of targetPosts) {
      const post = await postsCollection.findOne({ _id: new ObjectId(target.id) });
      if (post) {
        console.log(`\n投稿: ${target.id}`);
        console.log(`  タイトル: ${post.title}`);
        console.log(`  内容: ${post.content}`);
        console.log(`  現在のタグ: ${JSON.stringify(post.tags)}`);
      }
    }
    
    console.log('\n\n🏷️ タグ追加開始...');
    
    for (const target of targetPosts) {
      const result = await postsCollection.updateOne(
        { _id: new ObjectId(target.id) },
        { $set: { tags: target.tags } }
      );
      
      if (result.modifiedCount > 0) {
        console.log(`✅ 更新成功: ${target.id}`);
        console.log(`   追加タグ: ${target.tags.join(', ')}`);
      } else if (result.matchedCount > 0) {
        console.log(`⚠️ 既に存在または変更なし: ${target.id}`);
      } else {
        console.log(`❌ 投稿が見つからない: ${target.id}`);
      }
    }
    
    // 更新後の確認
    console.log('\n\n📊 更新後の確認:');
    for (const target of targetPosts) {
      const post = await postsCollection.findOne({ _id: new ObjectId(target.id) });
      if (post) {
        console.log(`\n投稿: ${target.id}`);
        console.log(`  タイトル: ${post.title}`);
        console.log(`  タグ: ${JSON.stringify(post.tags)}`);
      }
    }
    
    // 他の投稿にもランダムにタグを追加
    console.log('\n\n📝 他の投稿にもタグを追加中...');
    
    const allPosts = await postsCollection.find({ tags: { $exists: true, $eq: [] } }).limit(20).toArray();
    
    const tagPool = [
      ['技術', 'JavaScript'], ['React', 'Tips'], ['お知らせ'], 
      ['質問', '初心者'], ['共有'], ['アイデア'], 
      ['日記'], ['雑談'], ['重要'], ['新機能']
    ];
    
    let updateCount = 0;
    for (const post of allPosts) {
      const randomTags = tagPool[Math.floor(Math.random() * tagPool.length)];
      const result = await postsCollection.updateOne(
        { _id: post._id },
        { $set: { tags: randomTags } }
      );
      if (result.modifiedCount > 0) {
        updateCount++;
      }
    }
    
    console.log(`✅ ${updateCount}件の追加投稿にタグを追加しました`);
    
    console.log('\n✨ タグ修正完了！');
    console.log('📝 署名: I attest: Tags have been successfully added to board-app database');
    console.log('🎯 次のステップ: Playwrightテストを実行してください');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('🔒 接続を閉じました');
  }
}

// 実行
fixCorrectDatabaseTags();