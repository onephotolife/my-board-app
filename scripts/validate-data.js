#!/usr/bin/env node

/**
 * データ検証・診断スクリプト
 * 
 * 目的:
 * 1. 現在のデータベースの状態を診断
 * 2. 問題のあるデータを特定
 * 3. 修正が必要な項目をレポート
 * 
 * 使用方法:
 * node scripts/validate-data.js [--fix]
 */

const mongoose = require('mongoose');
require('dotenv').config();

const shouldFix = process.argv.includes('--fix');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`),
  data: (label, value) => console.log(`  ${colors.magenta}${label}:${colors.reset} ${value}`)
};

// スキーマ定義（期待される構造）
const expectedSchema = {
  posts: {
    required: ['title', 'content', 'author', 'authorInfo', 'status'],
    authorInfo: ['name', 'email'],
    validStatus: ['published', 'draft', 'deleted'],
    maxLengths: {
      title: 100,
      content: 1000,
      tags: 30
    }
  }
};

async function validateData() {
  const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
  
  try {
    log.section('データベース接続');
    await mongoose.connect(MONGODB_URI);
    log.success('MongoDB接続成功');

    // コレクションの取得
    const db = mongoose.connection.db;
    const postsCollection = db.collection('posts');
    const usersCollection = db.collection('users');

    // 診断結果を格納
    const report = {
      posts: {
        total: 0,
        issues: {
          nullStatus: [],
          invalidStatus: [],
          missingAuthorInfo: [],
          invalidAuthorInfo: [],
          missingAuthor: [],
          exceedsMaxLength: [],
          missingRequired: []
        }
      },
      users: {
        total: 0,
        issues: {
          unverified: [],
          missingName: []
        }
      }
    };

    // 1. 投稿データの検証
    log.section('投稿データの検証');
    
    const posts = await postsCollection.find({}).toArray();
    report.posts.total = posts.length;
    log.info(`総投稿数: ${posts.length}`);

    for (const post of posts) {
      const issues = [];

      // status検証
      if (!post.status) {
        report.posts.issues.nullStatus.push(post._id);
        issues.push('status=null');
      } else if (!expectedSchema.posts.validStatus.includes(post.status)) {
        report.posts.issues.invalidStatus.push({
          id: post._id,
          status: post.status
        });
        issues.push(`invalid status: ${post.status}`);
      }

      // authorInfo検証
      if (!post.authorInfo) {
        report.posts.issues.missingAuthorInfo.push(post._id);
        issues.push('authorInfo missing');
      } else {
        if (!post.authorInfo.name || !post.authorInfo.email) {
          report.posts.issues.invalidAuthorInfo.push({
            id: post._id,
            info: post.authorInfo
          });
          issues.push('incomplete authorInfo');
        }
      }

      // author検証
      if (!post.author) {
        report.posts.issues.missingAuthor.push(post._id);
        issues.push('author missing');
      }

      // 文字数制限検証
      if (post.title && post.title.length > expectedSchema.posts.maxLengths.title) {
        report.posts.issues.exceedsMaxLength.push({
          id: post._id,
          field: 'title',
          length: post.title.length
        });
        issues.push(`title too long: ${post.title.length} chars`);
      }

      if (post.content && post.content.length > expectedSchema.posts.maxLengths.content) {
        report.posts.issues.exceedsMaxLength.push({
          id: post._id,
          field: 'content',
          length: post.content.length
        });
        issues.push(`content too long: ${post.content.length} chars`);
      }

      // 必須フィールド検証
      for (const field of expectedSchema.posts.required) {
        if (field !== 'authorInfo' && !post[field]) {
          report.posts.issues.missingRequired.push({
            id: post._id,
            field
          });
          issues.push(`missing ${field}`);
        }
      }

      if (issues.length > 0) {
        log.warning(`Post ${post._id}: ${issues.join(', ')}`);
      }
    }

    // 2. ユーザーデータの検証
    log.section('ユーザーデータの検証');
    
    const users = await usersCollection.find({}).toArray();
    report.users.total = users.length;
    log.info(`総ユーザー数: ${users.length}`);

    for (const user of users) {
      const issues = [];

      if (!user.emailVerified) {
        report.users.issues.unverified.push(user.email);
        issues.push('email unverified');
      }

      if (!user.name) {
        report.users.issues.missingName.push(user.email);
        issues.push('name missing');
      }

      if (issues.length > 0) {
        log.warning(`User ${user.email}: ${issues.join(', ')}`);
      }
    }

    // 3. レポート生成
    log.section('診断結果サマリー');

    const totalIssues = 
      Object.values(report.posts.issues).reduce((sum, arr) => sum + arr.length, 0) +
      Object.values(report.users.issues).reduce((sum, arr) => sum + arr.length, 0);

    if (totalIssues === 0) {
      log.success('データベースに問題は見つかりませんでした！');
    } else {
      log.warning(`${totalIssues}個の問題が見つかりました`);

      // 投稿の問題
      console.log('\n📝 投稿データの問題:');
      if (report.posts.issues.nullStatus.length > 0) {
        log.data('status=null', `${report.posts.issues.nullStatus.length}件`);
      }
      if (report.posts.issues.invalidStatus.length > 0) {
        log.data('無効なstatus', `${report.posts.issues.invalidStatus.length}件`);
      }
      if (report.posts.issues.missingAuthorInfo.length > 0) {
        log.data('authorInfo欠落', `${report.posts.issues.missingAuthorInfo.length}件`);
      }
      if (report.posts.issues.invalidAuthorInfo.length > 0) {
        log.data('不完全なauthorInfo', `${report.posts.issues.invalidAuthorInfo.length}件`);
      }
      if (report.posts.issues.exceedsMaxLength.length > 0) {
        log.data('文字数超過', `${report.posts.issues.exceedsMaxLength.length}件`);
      }

      // ユーザーの問題
      if (report.users.issues.unverified.length > 0) {
        console.log('\n👤 ユーザーデータの問題:');
        log.data('未認証ユーザー', `${report.users.issues.unverified.length}人`);
      }
    }

    // 4. 修正の実行（--fixオプション時）
    if (shouldFix && totalIssues > 0) {
      log.section('自動修正の実行');
      
      let fixedCount = 0;

      // status=nullの修正
      if (report.posts.issues.nullStatus.length > 0) {
        const result = await postsCollection.updateMany(
          { status: null },
          { $set: { status: 'published' } }
        );
        fixedCount += result.modifiedCount;
        log.success(`${result.modifiedCount}件のstatus=nullを'published'に修正`);
      }

      // 無効なstatusの修正
      if (report.posts.issues.invalidStatus.length > 0) {
        const result = await postsCollection.updateMany(
          { status: { $nin: [...expectedSchema.posts.validStatus, null] } },
          { $set: { status: 'published' } }
        );
        fixedCount += result.modifiedCount;
        log.success(`${result.modifiedCount}件の無効なstatusを'published'に修正`);
      }

      // authorInfo欠落の修正
      if (report.posts.issues.missingAuthorInfo.length > 0) {
        for (const postId of report.posts.issues.missingAuthorInfo) {
          const post = await postsCollection.findOne({ _id: postId });
          
          // デフォルトのauthorInfo生成
          const authorInfo = {
            name: post.authorName || 'Unknown User',
            email: post.authorEmail || 'unknown@example.com',
            avatar: null
          };

          // author IDからユーザー情報を取得
          if (post.author) {
            const user = await usersCollection.findOne({ _id: post.author });
            if (user) {
              authorInfo.name = user.name || authorInfo.name;
              authorInfo.email = user.email || authorInfo.email;
              authorInfo.avatar = user.avatar || null;
            }
          }

          await postsCollection.updateOne(
            { _id: postId },
            { $set: { authorInfo } }
          );
          fixedCount++;
        }
        log.success(`${report.posts.issues.missingAuthorInfo.length}件のauthorInfoを生成`);
      }

      log.info(`合計 ${fixedCount} 件の問題を修正しました`);
    } else if (totalIssues > 0) {
      log.section('修正方法');
      console.log('自動修正を実行するには、以下のコマンドを実行してください:');
      console.log('  node scripts/validate-data.js --fix');
      console.log('\nまたは、マイグレーションスクリプトを実行:');
      console.log('  node scripts/migrate-posts.js');
    }

    // 5. 推奨事項
    if (totalIssues > 0) {
      log.section('推奨事項');
      console.log('1. データのバックアップを取得');
      console.log('2. 修正スクリプトを実行');
      console.log('3. アプリケーションの動作確認');
      console.log('4. 必要に応じてインデックスの再構築');
    }

  } catch (error) {
    log.error(`エラー: ${error.message}`);
    console.error(error);
  } finally {
    await mongoose.disconnect();
    log.info('データベース接続を終了しました');
  }
}

// スクリプト実行
validateData().catch(console.error);