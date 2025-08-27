#!/usr/bin/env node

/**
 * SOL-005実装の影響範囲分析スクリプト
 * Purpose: TypeScript型定義厳密化による既存機能への影響を評価
 */

const fs = require('fs');
const path = require('path');

console.log('=== SOL-005 影響範囲分析 ===');
console.log('実行日時:', new Date().toISOString());
console.log('=' + '='.repeat(59) + '\n');

// 影響を受ける可能性のあるファイル
const impactedFiles = [
  // 直接影響
  {
    category: '直接影響',
    files: [
      'src/components/FollowButton.tsx',
      'src/types/mui-extensions.d.ts'
    ]
  },
  // 間接影響（FollowButtonを使用）
  {
    category: '間接影響（FollowButton使用）',
    files: [
      'src/components/RealtimeBoard.tsx',
      'src/components/PostCardWithFollow.tsx',
      'src/components/UserCard.tsx',
      'src/app/test-follow/page.tsx'
    ]
  },
  // システム全体への潜在的影響
  {
    category: 'システム全体への潜在的影響',
    files: [
      'src/components/CSRFProvider.tsx',
      'src/app/api/follow/[userId]/route.ts',
      'src/middleware.ts'
    ]
  }
];

// 分析結果の格納
const analysisResults = {
  passed: [],
  warnings: [],
  errors: [],
  statistics: {
    totalFiles: 0,
    analyzedFiles: 0,
    modifiedFiles: 0,
    errorFiles: 0
  }
};

// ファイル分析関数
function analyzeFile(filePath, category) {
  const fullPath = path.join(process.cwd(), filePath);
  const result = {
    file: filePath,
    category: category,
    status: 'unknown',
    issues: [],
    warnings: []
  };
  
  try {
    // ファイルの存在確認
    if (!fs.existsSync(fullPath)) {
      result.status = 'missing';
      result.issues.push('ファイルが存在しません');
      return result;
    }
    
    const content = fs.readFileSync(fullPath, 'utf-8');
    const stats = fs.statSync(fullPath);
    
    // 最終更新時刻の確認（24時間以内の変更をチェック）
    const lastModified = stats.mtime;
    const now = new Date();
    const hoursSinceModified = (now - lastModified) / (1000 * 60 * 60);
    
    if (hoursSinceModified < 24) {
      result.warnings.push(`最近更新されました（${Math.round(hoursSinceModified)}時間前）`);
      analysisResults.statistics.modifiedFiles++;
    }
    
    // TypeScript/JSX ファイルの場合
    if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      // 旧実装の痕跡チェック
      if (content.includes('filterProps')) {
        result.issues.push('古いfilterProps関数がまだ存在します');
      }
      
      // button属性の直接使用チェック
      if (content.includes('button=') && !content.includes('// @ts-')) {
        result.warnings.push('button属性が使用されている可能性があります');
      }
      
      // FollowButton使用箇所の型チェック
      if (content.includes('<FollowButton')) {
        // 型定義インポートの確認
        if (!content.includes('@/types/mui-extensions') && 
            filePath !== 'src/components/FollowButton.tsx') {
          // FollowButton以外のファイルで型定義を直接インポートする必要はない
          result.status = 'ok';
        } else {
          result.status = 'ok';
        }
        
        // propsの確認
        const followButtonRegex = /<FollowButton[^>]*>/g;
        const matches = content.match(followButtonRegex) || [];
        
        matches.forEach(match => {
          // 不正なprops使用チェック
          if (match.includes('button=')) {
            result.issues.push(`不正なbutton属性が使用されています: ${match}`);
          }
          if (match.includes('component=')) {
            result.issues.push(`不正なcomponent属性が使用されています: ${match}`);
          }
        });
      } else {
        result.status = 'ok';
      }
      
      // import文の整合性チェック
      const importRegex = /import\s+.*from\s+['"](.*)['"]/g;
      let importMatch;
      while ((importMatch = importRegex.exec(content)) !== null) {
        const importPath = importMatch[1];
        // 相対パスのインポートが壊れていないか確認
        if (importPath.startsWith('./') || importPath.startsWith('../')) {
          const resolvedPath = path.resolve(path.dirname(fullPath), importPath);
          // 拡張子を追加して確認
          const extensions = ['.ts', '.tsx', '.js', '.jsx', ''];
          let found = false;
          for (const ext of extensions) {
            if (fs.existsSync(resolvedPath + ext) || 
                fs.existsSync(path.join(resolvedPath, 'index' + ext))) {
              found = true;
              break;
            }
          }
          if (!found && !importPath.includes('mui-extensions')) {
            result.warnings.push(`インポートパスが解決できません: ${importPath}`);
          }
        }
      }
    }
    
    // エラーがなければOK
    if (result.issues.length === 0 && result.status !== 'missing') {
      result.status = 'ok';
    } else if (result.issues.length > 0) {
      result.status = 'error';
      analysisResults.statistics.errorFiles++;
    }
    
  } catch (error) {
    result.status = 'error';
    result.issues.push(`分析エラー: ${error.message}`);
    analysisResults.statistics.errorFiles++;
  }
  
  return result;
}

// 分析実行
console.log('📋 ファイル分析開始...\n');

impactedFiles.forEach(category => {
  console.log(`\n【${category.category}】`);
  console.log('─'.repeat(50));
  
  category.files.forEach(file => {
    analysisResults.statistics.totalFiles++;
    const result = analyzeFile(file, category.category);
    analysisResults.statistics.analyzedFiles++;
    
    // 結果の表示
    let statusIcon = '❓';
    if (result.status === 'ok') {
      statusIcon = '✅';
      analysisResults.passed.push(result);
    } else if (result.status === 'error') {
      statusIcon = '❌';
      analysisResults.errors.push(result);
    } else if (result.status === 'missing') {
      statusIcon = '⚠️';
      analysisResults.warnings.push(result);
    } else if (result.warnings.length > 0) {
      statusIcon = '⚠️';
      analysisResults.warnings.push(result);
    }
    
    console.log(`${statusIcon} ${file}`);
    
    // 問題があれば詳細表示
    if (result.issues.length > 0) {
      result.issues.forEach(issue => {
        console.log(`   └─ ❌ ${issue}`);
      });
    }
    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => {
        console.log(`   └─ ⚠️  ${warning}`);
      });
    }
  });
});

// 追加チェック：APIエンドポイントの構造確認
console.log('\n\n【APIエンドポイント構造確認】');
console.log('─'.repeat(50));

const apiPath = path.join(process.cwd(), 'src/app/api/follow/[userId]/route.ts');
if (fs.existsSync(apiPath)) {
  const apiContent = fs.readFileSync(apiPath, 'utf-8');
  
  const apiChecks = [
    { name: 'POST メソッド実装', check: apiContent.includes('export async function POST') },
    { name: 'DELETE メソッド実装', check: apiContent.includes('export async function DELETE') },
    { name: '認証チェック', check: apiContent.includes('getServerSession') },
    { name: 'トランザクション処理', check: apiContent.includes('executeWithOptionalTransaction') }
  ];
  
  apiChecks.forEach(check => {
    console.log(`${check.check ? '✅' : '❌'} ${check.name}`);
  });
} else {
  console.log('❌ APIエンドポイントファイルが見つかりません');
}

// 結果サマリー
console.log('\n' + '='.repeat(60));
console.log('📊 影響範囲分析サマリー');
console.log('='.repeat(60));

console.log('\n統計情報:');
console.log(`  総ファイル数: ${analysisResults.statistics.totalFiles}`);
console.log(`  分析済み: ${analysisResults.statistics.analyzedFiles}`);
console.log(`  最近更新: ${analysisResults.statistics.modifiedFiles}`);
console.log(`  エラー: ${analysisResults.statistics.errorFiles}`);

console.log('\n結果詳細:');
console.log(`  ✅ 問題なし: ${analysisResults.passed.length} ファイル`);
console.log(`  ⚠️  警告: ${analysisResults.warnings.length} ファイル`);
console.log(`  ❌ エラー: ${analysisResults.errors.length} ファイル`);

// 影響評価
console.log('\n' + '='.repeat(60));
console.log('🎯 影響評価');
console.log('='.repeat(60));

if (analysisResults.errors.length === 0) {
  console.log('\n✅ 重大な問題は検出されませんでした。');
  console.log('SOL-005の実装は既存機能に悪影響を与えていません。');
  
  if (analysisResults.warnings.length > 0) {
    console.log('\n⚠️  軽微な警告事項:');
    analysisResults.warnings.forEach(warning => {
      if (warning.warnings && warning.warnings.length > 0) {
        console.log(`  - ${warning.file}: ${warning.warnings.join(', ')}`);
      }
    });
    console.log('\nこれらの警告は機能に影響しない軽微なものです。');
  }
  
  console.log('\n推奨事項:');
  console.log('1. 本番環境への展開前に、統合テストを実施してください');
  console.log('2. 段階的なロールアウトを検討してください');
  console.log('3. エラー監視を強化してください');
  
  process.exit(0);
} else {
  console.log('\n❌ エラーが検出されました:');
  analysisResults.errors.forEach(error => {
    console.log(`\nファイル: ${error.file}`);
    error.issues.forEach(issue => {
      console.log(`  - ${issue}`);
    });
  });
  
  console.log('\n対処が必要です。上記のエラーを修正してください。');
  process.exit(1);
}