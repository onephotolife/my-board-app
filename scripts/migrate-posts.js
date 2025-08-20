#!/usr/bin/env node

/**
 * 投稿データマイグレーションスクリプト
 * 
 * 目的:
 * 1. statusフィールドがnullの投稿を修正
 * 2. 古いスキーマから新しいスキーマへの移行
 * 3. データ整合性の確保
 * 
 * 使用方法:
 * node scripts/migrate-posts.js [--dry-run]
 */

const mongoose = require('mongoose');
require('dotenv').config();

// コマンドライン引数の解析
const isDryRun = process.argv.includes('--dry-run');

// カラー出力用
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

// ログヘルパー
const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`)
};

// MongoDBスキーマ定義（新仕様）
const PostSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  authorInfo: {
    name: { type: String, required: true },
    email: { type: String, required: true },
    avatar: { type: String, default: null }
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'deleted'],
    default: 'published',
    required: true
  },
  tags: [{ type: String, trim: true }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Userスキーマ（参照用）
const UserSchema = new mongoose.Schema({
  email: String,
  name: String,
  avatar: String
});

async function migrateData() {
  try {
    log.section('投稿データマイグレーション開始');
    
    if (isDryRun) {
      log.warning('DRY RUNモード: 実際の変更は行いません');
    }

    // MongoDB接続
    const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    log.info(`MongoDB接続中: ${MONGODB_URI}`);
    
    await mongoose.connect(MONGODB_URI);
    log.success('MongoDB接続成功');

    // モデル定義
    const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
    const User = mongoose.models.User || mongoose.model('User', UserSchema);

    // 統計情報の収集
    log.section('現在のデータ状態を分析');
    
    const totalPosts = await Post.countDocuments();
    const nullStatusPosts = await Post.countDocuments({ status: null });
    const missingAuthorInfo = await Post.countDocuments({ authorInfo: null });
    const oldSchemaFields = await Post.countDocuments({ 
      $or: [
        { authorName: { $exists: true } },
        { authorEmail: { $exists: true } }
      ]
    });

    log.info(`総投稿数: ${totalPosts}`);
    log.info(`status=nullの投稿: ${nullStatusPosts}`);
    log.info(`authorInfo未設定: ${missingAuthorInfo}`);
    log.info(`旧スキーマフィールド使用: ${oldSchemaFields}`);

    if (totalPosts === 0) {
      log.warning('投稿が存在しません。マイグレーション不要');
      return;
    }

    // マイグレーション実行
    log.section('マイグレーション実行');
    
    let migrationResults = {
      statusFixed: 0,
      authorInfoCreated: 0,
      oldFieldsRemoved: 0,
      errors: []
    };

    // 1. statusフィールドの修正
    if (nullStatusPosts > 0) {
      log.info(`${nullStatusPosts}件のstatus=null投稿を修正中...`);
      
      if (!isDryRun) {
        const result = await Post.updateMany(
          { status: null },
          { $set: { status: 'published' } }
        );
        migrationResults.statusFixed = result.modifiedCount;
        log.success(`${result.modifiedCount}件のstatusを'published'に設定`);
      } else {
        migrationResults.statusFixed = nullStatusPosts;
        log.info(`[DRY RUN] ${nullStatusPosts}件のstatusを'published'に設定予定`);
      }
    }

    // 2. authorInfoフィールドの生成
    const postsNeedingAuthorInfo = await Post.find({
      $or: [
        { authorInfo: null },
        { authorInfo: { $exists: false } }
      ]
    });

    if (postsNeedingAuthorInfo.length > 0) {
      log.info(`${postsNeedingAuthorInfo.length}件の投稿にauthorInfo生成中...`);
      
      for (const post of postsNeedingAuthorInfo) {
        try {
          // 既存のフィールドから情報を取得
          let authorInfo = {
            name: post.authorName || 'Unknown User',
            email: post.authorEmail || 'unknown@example.com',
            avatar: null
          };

          // authorフィールドからユーザー情報を取得
          if (post.author) {
            const user = await User.findById(post.author);
            if (user) {
              authorInfo = {
                name: user.name || authorInfo.name,
                email: user.email || authorInfo.email,
                avatar: user.avatar || null
              };
            }
          }

          if (!isDryRun) {
            post.authorInfo = authorInfo;
            
            // 旧フィールドの削除
            post.authorName = undefined;
            post.authorEmail = undefined;
            
            await post.save();
            migrationResults.authorInfoCreated++;
            log.success(`投稿 ${post._id}: authorInfo生成完了`);
          } else {
            migrationResults.authorInfoCreated++;
            log.info(`[DRY RUN] 投稿 ${post._id}: authorInfo生成予定`);
          }
        } catch (error) {
          migrationResults.errors.push({
            postId: post._id,
            error: error.message
          });
          log.error(`投稿 ${post._id} の処理中にエラー: ${error.message}`);
        }
      }
    }

    // 3. 不要なフィールドの削除
    if (oldSchemaFields > 0) {
      log.info(`${oldSchemaFields}件の投稿から旧フィールド削除中...`);
      
      if (!isDryRun) {
        const result = await Post.updateMany(
          {
            $or: [
              { authorName: { $exists: true } },
              { authorEmail: { $exists: true } }
            ]
          },
          {
            $unset: {
              authorName: '',
              authorEmail: ''
            }
          }
        );
        migrationResults.oldFieldsRemoved = result.modifiedCount;
        log.success(`${result.modifiedCount}件から旧フィールド削除`);
      } else {
        migrationResults.oldFieldsRemoved = oldSchemaFields;
        log.info(`[DRY RUN] ${oldSchemaFields}件から旧フィールド削除予定`);
      }
    }

    // 4. データ検証
    log.section('マイグレーション後の検証');
    
    if (!isDryRun) {
      const validationErrors = [];
      
      // 必須フィールドの確認
      const invalidPosts = await Post.find({
        $or: [
          { status: null },
          { status: { $nin: ['published', 'draft', 'deleted'] } },
          { authorInfo: null },
          { title: null },
          { content: null }
        ]
      });

      if (invalidPosts.length > 0) {
        log.warning(`${invalidPosts.length}件の無効な投稿が残っています`);
        invalidPosts.forEach(post => {
          validationErrors.push({
            id: post._id,
            issues: {
              status: !post.status || !['published', 'draft', 'deleted'].includes(post.status),
              authorInfo: !post.authorInfo,
              title: !post.title,
              content: !post.content
            }
          });
        });
      } else {
        log.success('すべての投稿が有効なスキーマに準拠しています');
      }

      // インデックスの再構築
      log.info('インデックスの再構築中...');
      await Post.collection.dropIndexes();
      await Post.collection.createIndex({ author: 1, createdAt: -1 });
      await Post.collection.createIndex({ status: 1, createdAt: -1 });
      await Post.collection.createIndex({ tags: 1 });
      log.success('インデックスの再構築完了');
    }

    // 結果サマリー
    log.section('マイグレーション結果');
    
    console.table({
      'status修正': migrationResults.statusFixed,
      'authorInfo生成': migrationResults.authorInfoCreated,
      '旧フィールド削除': migrationResults.oldFieldsRemoved,
      'エラー': migrationResults.errors.length
    });

    if (migrationResults.errors.length > 0) {
      log.warning('以下のエラーが発生しました:');
      migrationResults.errors.forEach(err => {
        console.log(`  - 投稿 ${err.postId}: ${err.error}`);
      });
    }

    // 最終統計
    if (!isDryRun) {
      const finalStats = {
        total: await Post.countDocuments(),
        published: await Post.countDocuments({ status: 'published' }),
        draft: await Post.countDocuments({ status: 'draft' }),
        deleted: await Post.countDocuments({ status: 'deleted' }),
        withAuthorInfo: await Post.countDocuments({ authorInfo: { $ne: null } })
      };

      log.section('最終データ統計');
      console.table(finalStats);
    }

    if (isDryRun) {
      log.section('DRY RUN完了');
      log.info('実際にマイグレーションを実行するには、--dry-runオプションを外してください');
      log.info('実行コマンド: node scripts/migrate-posts.js');
    } else {
      log.section('マイグレーション完了');
      log.success('すべての処理が正常に完了しました');
    }

  } catch (error) {
    log.error(`マイグレーションエラー: ${error.message}`);
    console.error(error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    log.info('MongoDB接続を終了しました');
  }
}

// スクリプト実行
if (require.main === module) {
  migrateData().catch(console.error);
}

module.exports = { migrateData };