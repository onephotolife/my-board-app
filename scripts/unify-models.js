#!/usr/bin/env node

/**
 * Postモデル統合スクリプト
 * 
 * 目的:
 * 1. 重複するPostモデル定義を統一
 * 2. import文を新しいモデルに更新
 * 3. 古いモデルファイルをバックアップ
 * 
 * 使用方法:
 * node scripts/unify-models.js [--dry-run]
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

// コマンドライン引数
const isDryRun = process.argv.includes('--dry-run');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

const log = {
  info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.cyan}━━━ ${msg} ━━━${colors.reset}`)
};

// 対象ファイルパターン
const FILE_PATTERNS = [
  'src/**/*.ts',
  'src/**/*.tsx',
  'src/**/*.js',
  'src/**/*.jsx'
];

// 古いモデルパス
const OLD_MODEL_PATHS = [
  'src/models/Post.ts',
  'src/lib/models/Post.ts'
];

// 新しいモデルパス
const NEW_MODEL_PATH = 'src/models/Post.unified.ts';

async function findFiles(pattern) {
  try {
    const { stdout } = await execAsync(`find . -path "./node_modules" -prune -o -path "${pattern}" -type f -print`);
    return stdout.split('\n').filter(Boolean).map(f => f.replace('./', ''));
  } catch (error) {
    return [];
  }
}

async function updateImports(filePath, oldImportPath, newImportPath) {
  try {
    let content = await fs.readFile(filePath, 'utf8');
    let updated = false;

    // import文のパターン
    const patterns = [
      // import Post from '@/models/Post'
      {
        regex: /import\s+(\w+)\s+from\s+['"]@\/models\/Post['"]/g,
        replacement: `import $1 from '@/models/Post.unified'`
      },
      // import Post from '@/lib/models/Post'
      {
        regex: /import\s+(\w+)\s+from\s+['"]@\/lib\/models\/Post['"]/g,
        replacement: `import $1 from '@/models/Post.unified'`
      },
      // import { IPost } from '@/models/Post'
      {
        regex: /import\s+\{([^}]+)\}\s+from\s+['"]@\/models\/Post['"]/g,
        replacement: `import {$1} from '@/models/Post.unified'`
      },
      // import { IPost } from '@/lib/models/Post'
      {
        regex: /import\s+\{([^}]+)\}\s+from\s+['"]@\/lib\/models\/Post['"]/g,
        replacement: `import {$1} from '@/models/Post.unified'`
      },
      // const Post = require('@/models/Post')
      {
        regex: /const\s+(\w+)\s*=\s*require\(['"]@\/models\/Post['"]\)/g,
        replacement: `const $1 = require('@/models/Post.unified')`
      },
      // const Post = require('@/lib/models/Post')
      {
        regex: /const\s+(\w+)\s*=\s*require\(['"]@\/lib\/models\/Post['"]\)/g,
        replacement: `const $1 = require('@/models/Post.unified')`
      }
    ];

    for (const pattern of patterns) {
      const newContent = content.replace(pattern.regex, pattern.replacement);
      if (newContent !== content) {
        content = newContent;
        updated = true;
      }
    }

    if (updated) {
      if (!isDryRun) {
        await fs.writeFile(filePath, content, 'utf8');
      }
      return true;
    }

    return false;
  } catch (error) {
    log.error(`Failed to update ${filePath}: ${error.message}`);
    return false;
  }
}

async function backupOldModels() {
  const backupDir = 'backups/models';
  
  if (!isDryRun) {
    await fs.mkdir(backupDir, { recursive: true });
  }

  for (const oldPath of OLD_MODEL_PATHS) {
    try {
      const exists = await fs.access(oldPath).then(() => true).catch(() => false);
      if (exists) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(backupDir, `${path.basename(oldPath)}.${timestamp}.backup`);
        
        if (!isDryRun) {
          const content = await fs.readFile(oldPath, 'utf8');
          await fs.writeFile(backupPath, content, 'utf8');
        }
        
        log.success(`Backed up ${oldPath} to ${backupPath}`);
      }
    } catch (error) {
      log.warning(`Could not backup ${oldPath}: ${error.message}`);
    }
  }
}

async function main() {
  log.section('Postモデル統合スクリプト');
  
  if (isDryRun) {
    log.warning('DRY RUNモード: 実際の変更は行いません');
  }

  // 1. 統一モデルファイルの存在確認
  log.section('統一モデルファイルの確認');
  try {
    await fs.access(NEW_MODEL_PATH);
    log.success(`統一モデルファイルが存在: ${NEW_MODEL_PATH}`);
  } catch {
    log.error(`統一モデルファイルが見つかりません: ${NEW_MODEL_PATH}`);
    log.info('先にPost.unified.tsを作成してください');
    process.exit(1);
  }

  // 2. 古いモデルのバックアップ
  log.section('古いモデルファイルのバックアップ');
  await backupOldModels();

  // 3. import文の更新
  log.section('import文の更新');
  let updatedCount = 0;
  let checkedCount = 0;

  for (const pattern of FILE_PATTERNS) {
    const files = await findFiles(pattern);
    
    for (const file of files) {
      // 統一モデルファイル自身はスキップ
      if (file === NEW_MODEL_PATH) continue;
      
      checkedCount++;
      const updated = await updateImports(file);
      
      if (updated) {
        updatedCount++;
        log.success(`更新: ${file}`);
      }
    }
  }

  log.info(`チェックしたファイル: ${checkedCount}個`);
  log.info(`更新したファイル: ${updatedCount}個`);

  // 4. TypeScriptコンパイルチェック
  if (!isDryRun && updatedCount > 0) {
    log.section('TypeScriptコンパイルチェック');
    try {
      const { stdout, stderr } = await execAsync('npx tsc --noEmit');
      if (stderr) {
        log.warning('TypeScript警告:');
        console.log(stderr);
      } else {
        log.success('TypeScriptコンパイルチェック成功');
      }
    } catch (error) {
      log.error('TypeScriptエラーが発生しました:');
      console.log(error.message);
      log.info('手動で修正が必要な可能性があります');
    }
  }

  // 5. 完了
  log.section('完了');
  
  if (isDryRun) {
    log.info('DRY RUN完了');
    log.info('実際に変更を適用するには、--dry-runオプションを外してください');
  } else {
    log.success('モデル統合が完了しました');
    
    // 次のステップの案内
    log.section('次のステップ');
    console.log('1. アプリケーションをテストしてください');
    console.log('2. 問題がなければ、古いモデルファイルを削除できます:');
    OLD_MODEL_PATHS.forEach(p => console.log(`   rm ${p}`));
    console.log('3. Post.unified.tsをPost.tsにリネームできます:');
    console.log(`   mv ${NEW_MODEL_PATH} src/models/Post.ts`);
  }
}

// スクリプト実行
main().catch(error => {
  log.error(`エラー: ${error.message}`);
  process.exit(1);
});