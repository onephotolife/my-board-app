#!/usr/bin/env node

/**
 * 全データベースとコレクションを確認
 */

import { MongoClient, ObjectId } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/?retryWrites=true&w=majority';

async function checkAllDatabases() {
  const client = new MongoClient(MONGODB_URI);
  
  try {
    console.log('🔗 MongoDB Atlasに接続中...');
    await client.connect();
    console.log('✅ 接続成功');
    
    // すべてのデータベースを取得
    const adminDb = client.db().admin();
    const databases = await adminDb.listDatabases();
    
    console.log('\n📦 利用可能なデータベース:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // テストユーザーの投稿IDを検索
    const targetIds = [
      '68a86b5aae3045ee7b36c7f8',
      '68a865701acd428543e98e30', 
      '68a85efe053689c4e74863e4'
    ];
    
    for (const dbInfo of databases.databases) {
      const dbName = dbInfo.name;
      
      // システムDBはスキップ
      if (dbName === 'admin' || dbName === 'local' || dbName === 'config') {
        continue;
      }
      
      console.log(`\n📁 データベース: ${dbName}`);
      console.log(`   サイズ: ${(dbInfo.sizeOnDisk / 1024 / 1024).toFixed(2)} MB`);
      
      const db = client.db(dbName);
      const collections = await db.listCollections().toArray();
      
      for (const col of collections) {
        const collection = db.collection(col.name);
        const count = await collection.countDocuments();
        console.log(`   📄 ${col.name}: ${count}件`);
        
        // postsまたはpostを含むコレクション名の場合、詳細確認
        if (col.name.toLowerCase().includes('post')) {
          console.log(`      🔍 投稿コレクション検出！`);
          
          // ターゲットIDを検索
          for (const id of targetIds) {
            try {
              // ObjectIdとして検索
              let found = await collection.findOne({ _id: new ObjectId(id) });
              if (found) {
                console.log(`      ✅ 発見: ${id} (ObjectId)`);
                console.log(`         タイトル: ${found.title}`);
                console.log(`         タグ: ${JSON.stringify(found.tags)}`);
              } else {
                // 文字列として検索
                found = await collection.findOne({ _id: id });
                if (found) {
                  console.log(`      ✅ 発見: ${id} (文字列)`);
                  console.log(`         タイトル: ${found.title}`);
                  console.log(`         タグ: ${JSON.stringify(found.tags)}`);
                }
              }
            } catch (e) {
              // ignore errors
            }
          }
          
          // 最初の3件を表示
          const samples = await collection.find({}).limit(3).toArray();
          if (samples.length > 0) {
            console.log(`      サンプル投稿:`)
            samples.forEach((post, i) => {
              console.log(`        ${i+1}. ID: ${post._id}`);
              console.log(`           タイトル: ${post.title || '(なし)'}`);
              console.log(`           タグ: ${JSON.stringify(post.tags || [])}`);
            });
          }
        }
      }
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('検索完了');
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  } finally {
    await client.close();
    console.log('🔒 接続を閉じました');
  }
}

// 実行
checkAllDatabases();