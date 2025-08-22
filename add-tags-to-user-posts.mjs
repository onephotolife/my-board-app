#!/usr/bin/env node

/**
 * テストユーザーの投稿にタグを追加
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';

async function addTagsToUserPosts() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 本番MongoDBに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    
    const db = client.db('boardDB');
    const postsCollection = db.collection('posts');
    
    // テストユーザーが見る3つの投稿のID
    const postIds = [
      '68a86b5aae3045ee7b36c7f8',  // タイトル3
      '68a865701acd428543e98e30',  // たいとる1
      '68a85efe053689c4e74863e4',  // タイトル
    ];
    
    console.log('📋 対象投稿の確認:');
    for (const id of postIds) {
      try {
        const post = await postsCollection.findOne({ _id: new ObjectId(id) });
        if (post) {
          console.log(`\n投稿: ${id}`);
          console.log(`  タイトル: ${post.title}`);
          console.log(`  内容: ${post.content}`);
          console.log(`  現在のタグ: ${JSON.stringify(post.tags)}`);
        } else {
          console.log(`❌ 投稿 ${id} が見つかりません`);
        }
      } catch (e) {
        console.log(`❌ エラー: ${id} - ${e.message}`);
      }
    }
    
    // タグを追加
    const updates = [
      { id: '68a86b5aae3045ee7b36c7f8', tags: ['お知らせ', '重要', '新機能'] },
      { id: '68a865701acd428543e98e30', tags: ['技術', 'React', 'Tips'] },
      { id: '68a85efe053689c4e74863e4', tags: ['一般', '質問', '初心者'] },
    ];
    
    console.log('\n\n🏷️ タグ追加開始...');
    
    for (const update of updates) {
      try {
        const result = await postsCollection.updateOne(
          { _id: new ObjectId(update.id) },
          { $set: { tags: update.tags } }
        );
        
        if (result.modifiedCount > 0) {
          console.log(`✅ 更新成功: ${update.id}`);
          console.log(`   追加タグ: ${update.tags.join(', ')}`);
        } else if (result.matchedCount > 0) {
          console.log(`⚠️ 既に同じタグ: ${update.id}`);
        } else {
          console.log(`❌ 投稿が見つからない: ${update.id}`);
        }
      } catch (e) {
        console.log(`❌ エラー: ${update.id} - ${e.message}`);
      }
    }
    
    // 更新後の確認
    console.log('\n\n📊 更新後の確認:');
    for (const id of postIds) {
      try {
        const post = await postsCollection.findOne({ _id: new ObjectId(id) });
        if (post) {
          console.log(`\n投稿: ${id}`);
          console.log(`  タイトル: ${post.title}`);
          console.log(`  タグ: ${JSON.stringify(post.tags)}`);
        }
      } catch (e) {
        console.log(`❌ エラー: ${id} - ${e.message}`);
      }
    }
    
    console.log('\n✨ タグ追加完了！');
    console.log('📝 次のステップ: Playwrightテストを再実行してください');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('🔒 接続を閉じました');
  }
}

// 実行
addTagsToUserPosts();