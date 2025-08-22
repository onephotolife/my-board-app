#!/usr/bin/env node

/**
 * 本番環境タグ修正スクリプト
 * 本番MongoDBに直接接続してタグを追加
 */

import { MongoClient } from 'mongodb';

// 本番MongoDB接続文字列（.env.localから）
const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';

async function fixProductionTags() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 本番MongoDBに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    
    const db = client.db('boardDB');
    const postsCollection = db.collection('posts');
    
    // 現在の投稿を確認
    const posts = await postsCollection.find({}).toArray();
    console.log(`\n📊 総投稿数: ${posts.length}件`);
    
    // 各投稿の現在の状態を表示
    console.log('\n現在の投稿状態:');
    posts.forEach((post, index) => {
      console.log(`投稿 ${index + 1}:`);
      console.log(`  ID: ${post._id}`);
      console.log(`  タイトル: ${post.title || 'なし'}`);
      console.log(`  内容: ${post.content ? post.content.substring(0, 30) + '...' : 'なし'}`);
      console.log(`  現在のタグ: ${post.tags ? JSON.stringify(post.tags) : 'なし'}`);
      console.log('');
    });
    
    // タグマッピング
    const tagMappings = [
      { id: '68a86b5aae3045ee7b36c7f8', tags: ['お知らせ', '重要'] },      // タイトル3
      { id: '68a865701acd428543e98e30', tags: ['技術', 'React', 'Tips'] }, // たいとる1
      { id: '68a85efe053689c4e74863e4', tags: ['一般', '質問'] },          // タイトル
    ];
    
    console.log('\n🏷️ タグ追加開始...');
    
    for (const mapping of tagMappings) {
      const result = await postsCollection.updateOne(
        { _id: { $oid: mapping.id } },
        { $set: { tags: mapping.tags } }
      ).catch(async (err) => {
        // ObjectIdの形式を試す
        const { ObjectId } = await import('mongodb');
        return postsCollection.updateOne(
          { _id: new ObjectId(mapping.id) },
          { $set: { tags: mapping.tags } }
        );
      });
      
      if (result.modifiedCount > 0) {
        console.log(`✅ 更新成功: ${mapping.id} -> ${mapping.tags.join(', ')}`);
      } else {
        console.log(`⚠️ 更新スキップ: ${mapping.id}`);
      }
    }
    
    // 更新後の確認
    console.log('\n📋 更新後の確認:');
    const updatedPosts = await postsCollection.find({}).toArray();
    updatedPosts.forEach((post, index) => {
      console.log(`投稿 ${index + 1}: タグ = ${JSON.stringify(post.tags)}`);
    });
    
    console.log('\n✨ タグ修正完了！');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
    console.error(error);
  } finally {
    await client.close();
    console.log('🔒 接続を閉じました');
  }
}

// 実行
fixProductionTags();