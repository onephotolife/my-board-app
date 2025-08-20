#!/usr/bin/env node

/**
 * MongoDB Atlas データ移行スクリプト
 * 14人天才会議 - 天才7
 * ローカルMongoDBからMongoDB Atlasへデータを移行
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const readline = require('readline');

// 環境変数を読み込み
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.production') });

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${COLORS[color]}${message}${COLORS.reset}`);
}

// ユーザー入力を取得
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(query) {
  return new Promise(resolve => rl.question(query, resolve));
}

// 接続オプション
const connectionOptions = {
  bufferCommands: false,
  maxPoolSize: 10,
  minPoolSize: 2,
  socketTimeoutMS: 45000,
  serverSelectionTimeoutMS: 30000,
  family: 4,
};

async function migrateData() {
  log('\n🧠 天才7: MongoDB Atlas データ移行\n', 'cyan');
  log('=' .repeat(70), 'cyan');
  
  // ソースとターゲットのURI設定
  const sourceUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
  let targetUri = process.env.MONGODB_URI_PRODUCTION;
  
  log('📋 移行元と移行先の確認', 'blue');
  log('=' .repeat(70), 'cyan');
  log(`移行元 (SOURCE): ${sourceUri.replace(/\/\/.*@/, '//***@')}`, 'cyan');
  
  if (!targetUri || targetUri.includes('username:password')) {
    log('\n⚠️  MongoDB Atlas接続文字列が設定されていません', 'yellow');
    log('MongoDB Atlasの接続文字列を入力してください:', 'yellow');
    log('形式: mongodb+srv://username:password@cluster.xxxxx.mongodb.net/boardDB', 'cyan');
    targetUri = await question('接続文字列: ');
    
    if (!targetUri) {
      log('❌ 接続文字列が入力されませんでした', 'red');
      process.exit(1);
    }
  }
  
  log(`移行先 (TARGET): ${targetUri.replace(/\/\/.*@/, '//***@')}`, 'cyan');
  
  // 確認
  log('\n⚠️  警告', 'yellow');
  log('この操作により、移行先のデータベースに既存のデータがある場合は上書きされます。', 'yellow');
  const confirm = await question('\n続行しますか？ (yes/no): ');
  
  if (confirm.toLowerCase() !== 'yes' && confirm.toLowerCase() !== 'y') {
    log('❌ 移行をキャンセルしました', 'red');
    process.exit(0);
  }
  
  let sourceConnection = null;
  let targetConnection = null;
  
  try {
    // ソースデータベースに接続
    log('\n🔄 移行元データベースに接続中...', 'yellow');
    sourceConnection = await mongoose.createConnection(sourceUri, connectionOptions);
    log('✅ 移行元データベースに接続しました', 'green');
    
    // ターゲットデータベースに接続
    log('🔄 移行先データベース (Atlas) に接続中...', 'yellow');
    const atlasOptions = {
      ...connectionOptions,
      retryWrites: true,
      w: 'majority',
    };
    targetConnection = await mongoose.createConnection(targetUri, atlasOptions);
    log('✅ 移行先データベース (Atlas) に接続しました', 'green');
    
    // コレクション一覧を取得
    const sourceDb = sourceConnection.db;
    const targetDb = targetConnection.db;
    const collections = await sourceDb.collections();
    
    log('\n📊 移行するコレクション', 'blue');
    log('=' .repeat(70), 'cyan');
    
    const migrationStats = {
      total: 0,
      success: 0,
      failed: 0,
      collections: {}
    };
    
    for (const collection of collections) {
      const collectionName = collection.collectionName;
      
      // システムコレクションはスキップ
      if (collectionName.startsWith('system.')) {
        continue;
      }
      
      log(`\n📁 ${collectionName} コレクションを処理中...`, 'blue');
      
      try {
        // ソースからドキュメントを取得
        const documents = await collection.find({}).toArray();
        const docCount = documents.length;
        
        if (docCount === 0) {
          log(`  ⚪ ドキュメントがありません`, 'cyan');
          migrationStats.collections[collectionName] = { count: 0, status: 'skipped' };
          continue;
        }
        
        log(`  📄 ${docCount} 件のドキュメントを発見`, 'cyan');
        
        // ターゲットコレクションを取得または作成
        const targetCollection = targetDb.collection(collectionName);
        
        // 既存データをクリア（オプション）
        const existingCount = await targetCollection.countDocuments();
        if (existingCount > 0) {
          log(`  ⚠️  既存の ${existingCount} 件のドキュメントを削除中...`, 'yellow');
          await targetCollection.deleteMany({});
        }
        
        // バッチ挿入（パフォーマンス向上のため）
        const batchSize = 100;
        let inserted = 0;
        
        for (let i = 0; i < documents.length; i += batchSize) {
          const batch = documents.slice(i, i + batchSize);
          
          // _idの処理（必要に応じて）
          const processedBatch = batch.map(doc => {
            // MongoDBの_idをそのまま使用
            return { ...doc };
          });
          
          try {
            await targetCollection.insertMany(processedBatch, { ordered: false });
            inserted += processedBatch.length;
            
            // 進捗表示
            const progress = Math.round((inserted / docCount) * 100);
            process.stdout.write(`\r  📊 進捗: ${progress}% (${inserted}/${docCount})`);
          } catch (error) {
            log(`\n  ⚠️  バッチ挿入エラー: ${error.message}`, 'yellow');
            // 個別挿入を試みる
            for (const doc of processedBatch) {
              try {
                await targetCollection.insertOne(doc);
                inserted++;
              } catch (docError) {
                log(`  ❌ ドキュメント挿入失敗: ${docError.message}`, 'red');
                migrationStats.failed++;
              }
            }
          }
        }
        
        console.log(''); // 改行
        log(`  ✅ ${inserted} 件のドキュメントを移行しました`, 'green');
        
        migrationStats.collections[collectionName] = { 
          count: inserted, 
          status: 'success',
          original: docCount 
        };
        migrationStats.success += inserted;
        migrationStats.total += docCount;
        
        // インデックスの移行（オプション）
        const indexes = await collection.indexes();
        const nonDefaultIndexes = indexes.filter(idx => idx.name !== '_id_');
        
        if (nonDefaultIndexes.length > 0) {
          log(`  🔑 ${nonDefaultIndexes.length} 個のインデックスを移行中...`, 'cyan');
          for (const index of nonDefaultIndexes) {
            try {
              const { v, key, name, ...options } = index;
              await targetCollection.createIndex(key, { ...options, background: true });
              log(`    ✅ インデックス '${name}' を作成`, 'green');
            } catch (indexError) {
              log(`    ⚠️  インデックス '${index.name}' の作成失敗: ${indexError.message}`, 'yellow');
            }
          }
        }
        
      } catch (error) {
        log(`  ❌ エラー: ${error.message}`, 'red');
        migrationStats.collections[collectionName] = { 
          count: 0, 
          status: 'failed',
          error: error.message 
        };
      }
    }
    
    // 移行結果のサマリー
    log('\n' + '='.repeat(70), 'cyan');
    log('📊 移行完了サマリー', 'magenta');
    log('=' .repeat(70), 'cyan');
    
    log(`\n総ドキュメント数: ${migrationStats.total}`, 'cyan');
    log(`✅ 成功: ${migrationStats.success}`, 'green');
    log(`❌ 失敗: ${migrationStats.failed}`, migrationStats.failed > 0 ? 'red' : 'green');
    
    log('\nコレクション別:', 'cyan');
    for (const [name, stats] of Object.entries(migrationStats.collections)) {
      const statusIcon = stats.status === 'success' ? '✅' : 
                         stats.status === 'failed' ? '❌' : '⚪';
      log(`  ${statusIcon} ${name}: ${stats.count} ドキュメント`, 
          stats.status === 'success' ? 'green' : 
          stats.status === 'failed' ? 'red' : 'cyan');
    }
    
    // 移行先の確認
    log('\n🔍 移行先データベースの確認', 'blue');
    log('=' .repeat(70), 'cyan');
    
    const targetCollections = await targetDb.collections();
    for (const collection of targetCollections) {
      if (!collection.collectionName.startsWith('system.')) {
        const count = await collection.countDocuments();
        log(`  ${collection.collectionName}: ${count} ドキュメント`, 'cyan');
      }
    }
    
    log('\n' + '='.repeat(70), 'cyan');
    log('🎉 データ移行が完了しました！', 'green');
    log('MongoDB Atlas でデータを確認してください', 'green');
    log('=' .repeat(70) + '\n', 'cyan');
    
    // .env.production ファイルの更新を提案
    if (targetUri !== process.env.MONGODB_URI_PRODUCTION) {
      log('\n💡 ヒント: .env.production ファイルを更新してください:', 'yellow');
      log(`MONGODB_URI_PRODUCTION=${targetUri}`, 'cyan');
    }
    
  } catch (error) {
    log(`\n❌ 移行エラー: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    // 接続をクローズ
    if (sourceConnection) {
      await sourceConnection.close();
      log('\n🛑 移行元データベース接続を終了', 'cyan');
    }
    if (targetConnection) {
      await targetConnection.close();
      log('🛑 移行先データベース接続を終了', 'cyan');
    }
    rl.close();
  }
}

// メイン実行
migrateData().catch((error) => {
  log(`\n❌ 致命的エラー: ${error.message}`, 'red');
  process.exit(1);
});