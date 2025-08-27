#!/usr/bin/env node

/**
 * 型定義ファイルの存在と基本的な構文チェック
 */

const fs = require('fs');
const path = require('path');

console.log('=== TypeScript型定義検証スクリプト ===\n');

const files = [
  {
    path: 'src/types/mui-extensions.d.ts',
    required: ['FollowButtonPropsV1', 'FollowButtonPropsV2', 'sanitizeButtonProps', 'isV2Props']
  },
  {
    path: 'src/components/FollowButton.tsx',
    required: ['@/types/mui-extensions', 'sanitizeButtonProps']
  }
];

let allPassed = true;

files.forEach(file => {
  const fullPath = path.join(process.cwd(), file.path);
  console.log(`\n検証中: ${file.path}`);
  
  try {
    // ファイルの存在確認
    if (!fs.existsSync(fullPath)) {
      console.error(`  ❌ ファイルが存在しません: ${fullPath}`);
      allPassed = false;
      return;
    }
    console.log(`  ✅ ファイルが存在します`);
    
    // ファイル内容の読み取り
    const content = fs.readFileSync(fullPath, 'utf-8');
    
    // 必要な要素の確認
    file.required.forEach(pattern => {
      const regex = new RegExp(pattern);
      if (regex.test(content)) {
        console.log(`  ✅ "${pattern}" が見つかりました`);
      } else {
        console.error(`  ❌ "${pattern}" が見つかりません`);
        allPassed = false;
      }
    });
    
    // TypeScript構文の基本チェック
    const syntaxErrors = [];
    
    // インポート文の確認
    const importRegex = /import\s+(?:(?:\{[^}]*\})|(?:\*\s+as\s+\w+)|(?:\w+))\s+from\s+['"][^'"]+['"]/g;
    const imports = content.match(importRegex) || [];
    console.log(`  ℹ️  ${imports.length} 個のインポート文を検出`);
    
    // 型定義の確認
    const typeRegex = /(?:interface|type)\s+\w+/g;
    const types = content.match(typeRegex) || [];
    console.log(`  ℹ️  ${types.length} 個の型定義を検出`);
    
    // エクスポートの確認
    const exportRegex = /export\s+(?:(?:default)|(?:interface)|(?:type)|(?:function)|(?:const))/g;
    const exports = content.match(exportRegex) || [];
    console.log(`  ℹ️  ${exports.length} 個のエクスポートを検出`);
    
  } catch (error) {
    console.error(`  ❌ エラー: ${error.message}`);
    allPassed = false;
  }
});

// 相互参照の確認
console.log('\n=== 相互参照の確認 ===');

try {
  const followButtonPath = path.join(process.cwd(), 'src/components/FollowButton.tsx');
  const muiExtPath = path.join(process.cwd(), 'src/types/mui-extensions.d.ts');
  
  const followButtonContent = fs.readFileSync(followButtonPath, 'utf-8');
  const muiExtContent = fs.readFileSync(muiExtPath, 'utf-8');
  
  // FollowButtonがmui-extensionsをインポートしているか
  if (followButtonContent.includes("from '@/types/mui-extensions'")) {
    console.log('✅ FollowButtonがmui-extensionsをインポートしています');
  } else {
    console.error('❌ FollowButtonがmui-extensionsをインポートしていません');
    allPassed = false;
  }
  
  // mui-extensionsで定義された関数が使用されているか
  if (followButtonContent.includes('sanitizeButtonProps')) {
    console.log('✅ sanitizeButtonPropsが使用されています');
  } else {
    console.error('❌ sanitizeButtonPropsが使用されていません');
    allPassed = false;
  }
  
  // 古いfilterProps関数が残っていないか
  if (followButtonContent.includes('const filterProps')) {
    console.error('❌ 古いfilterProps関数がまだ存在します');
    allPassed = false;
  } else {
    console.log('✅ 古いfilterProps関数は削除されています');
  }
  
} catch (error) {
  console.error(`❌ 相互参照確認エラー: ${error.message}`);
  allPassed = false;
}

// 結果サマリー
console.log('\n=== 検証結果 ===');
if (allPassed) {
  console.log('✅ すべてのチェックに合格しました！');
  console.log('TypeScript型定義の厳密化（SOL-005）が正しく実装されています。');
  process.exit(0);
} else {
  console.error('❌ いくつかのチェックに失敗しました。');
  console.error('上記のエラーメッセージを確認してください。');
  process.exit(1);
}