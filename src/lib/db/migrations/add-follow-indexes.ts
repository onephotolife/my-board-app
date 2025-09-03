/**
 * フォロー機能のインデックスとマイグレーションスクリプト
 * 
 * 実行方法:
 * npm run migrate:follows
 * または
 * npx ts-node src/lib/db/migrations/add-follow-indexes.ts
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

/**
 * インデックス作成とデータマイグレーション
 */
async function migrateFollowFeature() {
  try {
    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    await mongoose.connect(MONGODB_URI);
    console.warn('✅ MongoDB接続成功');
    
    const db = mongoose.connection.db;
    
    // 1. Followコレクションのインデックス作成
    console.warn('📋 Followコレクションのインデックスを作成中...');
    
    const followCollection = db.collection('follows');
    
    // 既存のインデックスを確認
    const existingIndexes = await followCollection.indexes();
    console.warn('既存インデックス:', existingIndexes.map(idx => idx.name));
    
    // インデックス作成（重複防止）
    const indexesToCreate = [
      // 複合ユニークインデックス（重複フォロー防止）
      { key: { follower: 1, following: 1 }, unique: true, name: 'follower_following_unique' },
      
      // 単一インデックス（クエリ最適化）
      { key: { follower: 1 }, name: 'follower_1' },
      { key: { following: 1 }, name: 'following_1' },
      { key: { isReciprocal: 1 }, name: 'isReciprocal_1' },
      
      // 複合インデックス（相互フォローチェック用）
      { key: { following: 1, follower: 1 }, name: 'following_follower_1' },
      
      // タイムライン用インデックス
      { key: { follower: 1, createdAt: -1 }, name: 'follower_createdAt' },
      { key: { following: 1, createdAt: -1 }, name: 'following_createdAt' },
    ];
    
    for (const index of indexesToCreate) {
      try {
        await followCollection.createIndex(index.key, { 
          unique: index.unique, 
          name: index.name,
          background: true  // バックグラウンドで作成（本番環境向け）
        });
        console.warn(`✅ インデックス作成成功: ${index.name}`);
      } catch (error: any) {
        if (error.code === 11000 || error.code === 85) {
          console.warn(`⚠️  インデックス既存: ${index.name}`);
        } else {
          console.error(`❌ インデックス作成失敗: ${index.name}`, error.message);
        }
      }
    }
    
    // 2. Userコレクションの既存ドキュメントにフォロー関連フィールドを追加
    console.warn('\n📋 Userコレクションのマイグレーション中...');
    
    const userCollection = db.collection('users');
    
    // フォロー関連フィールドが存在しないドキュメントを更新
    const updateResult = await userCollection.updateMany(
      {
        $or: [
          { followingCount: { $exists: false } },
          { followersCount: { $exists: false } },
          { mutualFollowsCount: { $exists: false } },
        ]
      },
      {
        $set: {
          followingCount: 0,
          followersCount: 0,
          mutualFollowsCount: 0,
          isPrivate: false,
        }
      }
    );
    
    console.warn(`✅ ${updateResult.modifiedCount}件のユーザードキュメントを更新`);
    
    // 3. パフォーマンステスト用のインデックス統計
    console.warn('\n📊 インデックス統計:');
    
    const followStats = await followCollection.stats();
    console.warn(`- Followコレクション:
      - ドキュメント数: ${followStats.count}
      - インデックス数: ${followStats.nindexes}
      - インデックスサイズ: ${(followStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    
    const userStats = await userCollection.stats();
    console.warn(`- Userコレクション:
      - ドキュメント数: ${userStats.count}
      - インデックス数: ${userStats.nindexes}
      - インデックスサイズ: ${(userStats.totalIndexSize / 1024 / 1024).toFixed(2)} MB`);
    
    // 4. サンプルクエリのExplain実行計画
    console.warn('\n🔍 クエリ実行計画の検証:');
    
    // フォロワー取得クエリの実行計画
    const explainResult = await followCollection
      .find({ following: new mongoose.Types.ObjectId() })
      .explain('executionStats');
    
    console.warn(`- フォロワー取得クエリ:
      - 使用インデックス: ${explainResult.executionStats.executionStages.indexName || 'なし'}
      - 検査ドキュメント数: ${explainResult.executionStats.totalDocsExamined}
      - 実行時間: ${explainResult.executionStats.executionTimeMillis}ms`);
    
    console.warn('\n✅ マイグレーション完了');
    
  } catch (error) {
    console.error('❌ マイグレーションエラー:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.warn('🔌 MongoDB接続終了');
  }
}

// 実行
if (require.main === module) {
  migrateFollowFeature();
}

export default migrateFollowFeature;