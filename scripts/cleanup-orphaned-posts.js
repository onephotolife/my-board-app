#!/usr/bin/env node

/**
 * 孤立した投稿のクリーンアップスクリプト
 * 
 * 目的: Userコレクションに存在しないユーザーを参照している投稿を処理
 * 戦略: 匿名化（削除ではなくデータ保持を優先）
 * 
 * 使用方法:
 *   DRY_RUN=true node scripts/cleanup-orphaned-posts.js  # ドライラン（変更なし）
 *   node scripts/cleanup-orphaned-posts.js                # 実際の実行
 *   STRATEGY=delete node scripts/cleanup-orphaned-posts.js # 削除戦略で実行
 */

const mongoose = require('mongoose');
const { ObjectId } = mongoose.Types;

// 環境変数
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
const DRY_RUN = process.env.DRY_RUN === 'true';
const STRATEGY = process.env.STRATEGY || 'anonymize'; // 'anonymize' or 'delete'
const BATCH_SIZE = parseInt(process.env.BATCH_SIZE || '100', 10);

// 統計情報
const stats = {
  totalPosts: 0,
  orphanedPosts: 0,
  processedPosts: 0,
  failedPosts: 0,
  errors: []
};

// カラー出力用のヘルパー
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Postスキーマ（簡略版）
const postSchema = new mongoose.Schema({
  title: String,
  content: String,
  author: {
    _id: String,
    name: String,
    email: String
  },
  status: String,
  category: String,
  tags: [String],
  views: Number,
}, { timestamps: true });

const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

// Userスキーマ（簡略版）
const userSchema = new mongoose.Schema({
  email: String,
  name: String,
  emailVerified: Boolean,
  role: String
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

/**
 * 孤立した投稿を特定する
 */
async function identifyOrphanedPosts() {
  log('\n=== 孤立した投稿の特定 ===', 'cyan');
  
  try {
    // 全投稿を取得
    const posts = await Post.find({ 'author._id': { $exists: true } })
      .select('_id title author createdAt')
      .lean();
    
    stats.totalPosts = posts.length;
    log(`📊 総投稿数: ${stats.totalPosts}`, 'blue');
    
    // バッチ処理で孤立投稿を特定
    const orphanedPosts = [];
    const batchCount = Math.ceil(posts.length / BATCH_SIZE);
    
    for (let i = 0; i < batchCount; i++) {
      const batch = posts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
      const authorIds = batch.map(p => p.author._id).filter(Boolean);
      
      // 存在するユーザーIDを取得
      const existingUsers = await User.find({
        _id: { $in: authorIds.map(id => {
          try {
            return new ObjectId(id);
          } catch {
            return null;
          }
        }).filter(Boolean) }
      }).select('_id').lean();
      
      const existingUserIds = new Set(existingUsers.map(u => u._id.toString()));
      
      // 孤立した投稿を特定
      for (const post of batch) {
        if (post.author._id && !existingUserIds.has(post.author._id)) {
          orphanedPosts.push(post);
        }
      }
      
      // 進捗表示
      const progress = Math.round(((i + 1) / batchCount) * 100);
      process.stdout.write(`\r進捗: ${progress}% (${(i + 1) * BATCH_SIZE}/${posts.length})`);
    }
    
    console.log(); // 改行
    stats.orphanedPosts = orphanedPosts.length;
    
    if (orphanedPosts.length === 0) {
      log('✅ 孤立した投稿は見つかりませんでした', 'green');
      return [];
    }
    
    log(`\n⚠️  孤立した投稿が ${orphanedPosts.length} 件見つかりました:`, 'yellow');
    
    // 最初の5件を表示
    orphanedPosts.slice(0, 5).forEach(post => {
      log(`  - 投稿ID: ${post._id}`, 'yellow');
      log(`    タイトル: ${post.title || '(無題)'}`, 'yellow');
      log(`    元の作成者ID: ${post.author._id}`, 'yellow');
      log(`    元の作成者名: ${post.author.name}`, 'yellow');
      log(`    作成日: ${post.createdAt}`, 'yellow');
    });
    
    if (orphanedPosts.length > 5) {
      log(`  ... 他 ${orphanedPosts.length - 5} 件`, 'yellow');
    }
    
    return orphanedPosts;
    
  } catch (error) {
    log(`❌ エラー: ${error.message}`, 'red');
    stats.errors.push(error.message);
    throw error;
  }
}

/**
 * 投稿を匿名化する
 */
async function anonymizePosts(orphanedPosts) {
  log('\n=== 投稿の匿名化処理 ===', 'cyan');
  
  if (DRY_RUN) {
    log('🔍 ドライランモード: 実際の変更は行いません', 'magenta');
  }
  
  const anonymousAuthor = {
    _id: null,
    name: '削除されたユーザー',
    email: 'deleted@example.com'
  };
  
  let successCount = 0;
  let failCount = 0;
  
  // バッチ処理で匿名化
  const batchCount = Math.ceil(orphanedPosts.length / BATCH_SIZE);
  
  for (let i = 0; i < batchCount; i++) {
    const batch = orphanedPosts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    
    if (!DRY_RUN) {
      try {
        const result = await Post.updateMany(
          { _id: { $in: batch.map(p => p._id) } },
          { $set: { author: anonymousAuthor } }
        );
        successCount += result.modifiedCount;
      } catch (error) {
        failCount += batch.length;
        stats.errors.push(`バッチ ${i + 1} の匿名化に失敗: ${error.message}`);
      }
    } else {
      successCount += batch.length;
    }
    
    // 進捗表示
    const progress = Math.round(((i + 1) / batchCount) * 100);
    process.stdout.write(`\r匿名化進捗: ${progress}% (${(i + 1) * BATCH_SIZE}/${orphanedPosts.length})`);
  }
  
  console.log(); // 改行
  
  stats.processedPosts = successCount;
  stats.failedPosts = failCount;
  
  if (!DRY_RUN) {
    log(`✅ ${successCount} 件の投稿を匿名化しました`, 'green');
    if (failCount > 0) {
      log(`⚠️  ${failCount} 件の投稿の匿名化に失敗しました`, 'yellow');
    }
  } else {
    log(`📋 ${successCount} 件の投稿が匿名化対象です（ドライラン）`, 'blue');
  }
}

/**
 * 投稿を削除する
 */
async function deletePosts(orphanedPosts) {
  log('\n=== 投稿の削除処理 ===', 'cyan');
  
  if (DRY_RUN) {
    log('🔍 ドライランモード: 実際の削除は行いません', 'magenta');
  }
  
  let successCount = 0;
  let failCount = 0;
  
  // バッチ処理で削除
  const batchCount = Math.ceil(orphanedPosts.length / BATCH_SIZE);
  
  for (let i = 0; i < batchCount; i++) {
    const batch = orphanedPosts.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
    
    if (!DRY_RUN) {
      try {
        const result = await Post.deleteMany(
          { _id: { $in: batch.map(p => p._id) } }
        );
        successCount += result.deletedCount;
      } catch (error) {
        failCount += batch.length;
        stats.errors.push(`バッチ ${i + 1} の削除に失敗: ${error.message}`);
      }
    } else {
      successCount += batch.length;
    }
    
    // 進捗表示
    const progress = Math.round(((i + 1) / batchCount) * 100);
    process.stdout.write(`\r削除進捗: ${progress}% (${(i + 1) * BATCH_SIZE}/${orphanedPosts.length})`);
  }
  
  console.log(); // 改行
  
  stats.processedPosts = successCount;
  stats.failedPosts = failCount;
  
  if (!DRY_RUN) {
    log(`✅ ${successCount} 件の投稿を削除しました`, 'green');
    if (failCount > 0) {
      log(`⚠️  ${failCount} 件の投稿の削除に失敗しました`, 'yellow');
    }
  } else {
    log(`📋 ${successCount} 件の投稿が削除対象です（ドライラン）`, 'blue');
  }
}

/**
 * バックアップを作成
 */
async function createBackup() {
  log('\n=== バックアップ作成 ===', 'cyan');
  
  if (DRY_RUN) {
    log('🔍 ドライランモードのためバックアップをスキップ', 'blue');
    return;
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupCollectionName = `posts_backup_${timestamp}`;
  
  try {
    // バックアップコレクションを作成
    await mongoose.connection.db.createCollection(backupCollectionName);
    
    // 全投稿をバックアップ
    const posts = await Post.find({}).lean();
    if (posts.length > 0) {
      await mongoose.connection.db
        .collection(backupCollectionName)
        .insertMany(posts);
      
      log(`✅ バックアップコレクション作成: ${backupCollectionName}`, 'green');
      log(`   ${posts.length} 件の投稿をバックアップしました`, 'green');
    }
  } catch (error) {
    log(`⚠️  バックアップ作成に失敗: ${error.message}`, 'yellow');
    stats.errors.push(`バックアップ作成失敗: ${error.message}`);
  }
}

/**
 * 統計レポートを出力
 */
function printReport() {
  log('\n' + '='.repeat(60), 'cyan');
  log('📊 実行結果レポート', 'cyan');
  log('='.repeat(60), 'cyan');
  
  log(`\n実行モード: ${DRY_RUN ? 'ドライラン' : '本番実行'}`, 'blue');
  log(`処理戦略: ${STRATEGY === 'delete' ? '削除' : '匿名化'}`, 'blue');
  log(`バッチサイズ: ${BATCH_SIZE}`, 'blue');
  
  log('\n統計情報:', 'magenta');
  log(`  総投稿数: ${stats.totalPosts}`, 'white');
  log(`  孤立投稿数: ${stats.orphanedPosts}`, 'yellow');
  log(`  処理成功: ${stats.processedPosts}`, 'green');
  log(`  処理失敗: ${stats.failedPosts}`, stats.failedPosts > 0 ? 'red' : 'white');
  
  if (stats.errors.length > 0) {
    log('\n⚠️  エラー詳細:', 'red');
    stats.errors.forEach((error, index) => {
      log(`  ${index + 1}. ${error}`, 'red');
    });
  }
  
  log('\n' + '='.repeat(60), 'cyan');
  log(`実行完了時刻: ${new Date().toLocaleString('ja-JP')}`, 'blue');
  log('='.repeat(60), 'cyan');
}

/**
 * メイン処理
 */
async function main() {
  try {
    // ヘッダー表示
    log('\n' + '='.repeat(60), 'cyan');
    log('🧹 孤立した投稿のクリーンアップスクリプト', 'cyan');
    log('='.repeat(60), 'cyan');
    
    // MongoDB接続
    log('\n📡 MongoDBに接続中...', 'blue');
    await mongoose.connect(MONGODB_URI);
    log('✅ MongoDB接続成功', 'green');
    
    // バックアップ作成（本番実行時のみ）
    if (!DRY_RUN && STRATEGY === 'delete') {
      await createBackup();
    }
    
    // 孤立した投稿を特定
    const orphanedPosts = await identifyOrphanedPosts();
    
    if (orphanedPosts.length === 0) {
      log('\n✨ 処理対象がないため終了します', 'green');
      return;
    }
    
    // ユーザー確認（本番実行時のみ）
    if (!DRY_RUN) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const answer = await new Promise(resolve => {
        readline.question(
          `\n⚠️  ${orphanedPosts.length} 件の投稿を${STRATEGY === 'delete' ? '削除' : '匿名化'}します。続行しますか？ (yes/no): `,
          resolve
        );
      });
      readline.close();
      
      if (answer.toLowerCase() !== 'yes') {
        log('\n❌ 処理をキャンセルしました', 'yellow');
        return;
      }
    }
    
    // 処理実行
    if (STRATEGY === 'delete') {
      await deletePosts(orphanedPosts);
    } else {
      await anonymizePosts(orphanedPosts);
    }
    
  } catch (error) {
    log(`\n❌ 致命的エラー: ${error.message}`, 'red');
    console.error(error.stack);
    process.exit(1);
  } finally {
    // レポート出力
    printReport();
    
    // MongoDB接続を閉じる
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log('\n🔌 MongoDB接続を閉じました', 'blue');
    }
  }
}

// 実行
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  identifyOrphanedPosts,
  anonymizePosts,
  deletePosts
};