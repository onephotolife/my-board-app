#!/usr/bin/env node

/**
 * モバイルメニューz-index問題の詳細診断ツール
 * ブラウザを使用せずにコードを静的解析
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 モバイルメニューz-index問題診断開始\n');
console.log('='.repeat(60));

// 1. Header.tsx のコード検証
console.log('\n📄 Header.tsx の検証:');
const headerPath = path.join(__dirname, '../src/components/Header.tsx');
const headerCode = fs.readFileSync(headerPath, 'utf-8');

// Portal実装の確認
const hasPortal = headerCode.includes('<Portal>');
const portalZIndex = headerCode.match(/zIndex:\s*([0-9]+)/g);
console.log(`  ✓ Portal実装: ${hasPortal ? '有り' : '無し'}`);
if (portalZIndex) {
  console.log(`  ✓ z-index値: ${portalZIndex.join(', ')}`);
}

// モバイルメニューの条件
const mobileMenuCondition = headerCode.includes('{isMobile && open &&');
console.log(`  ✓ モバイル条件: ${mobileMenuCondition ? '正しい' : '問題あり'}`);

// 2. globals.css の検証
console.log('\n📄 globals.css の検証:');
const cssPath = path.join(__dirname, '../src/app/globals.css');
const cssCode = fs.readFileSync(cssPath, 'utf-8');

// transform設定の確認
const hasTransformNone = cssCode.includes('transform: none');
console.log(`  ✓ transform: none: ${hasTransformNone ? '存在（問題）' : '削除済み'}`);

// z-index関連のCSS
const zIndexRules = cssCode.match(/z-index:\s*[^;]+/g);
if (zIndexRules) {
  console.log('  ✓ z-index ルール:');
  zIndexRules.forEach(rule => {
    console.log(`    - ${rule}`);
  });
}

// 3. providers.tsx の検証
console.log('\n📄 providers.tsx の検証:');
const providersPath = path.join(__dirname, '../src/app/providers.tsx');
const providersCode = fs.readFileSync(providersPath, 'utf-8');

// MUI zIndex設定
const muiZIndex = providersCode.match(/zIndex:\s*{[^}]+}/s);
if (muiZIndex) {
  console.log(`  ✓ MUI zIndex設定: ${muiZIndex[0].replace(/\s+/g, ' ')}`);
}

// 4. 問題診断
console.log('\n🔍 問題診断:');
console.log('='.repeat(60));

const issues = [];
const solutions = [];

// Portal実装チェック
if (!hasPortal) {
  issues.push('❌ Portal実装が見つかりません');
  solutions.push('Portal実装を追加する必要があります');
}

// z-index値チェック
if (portalZIndex) {
  const maxZIndex = Math.max(...portalZIndex.map(z => parseInt(z.match(/\d+/)[0])));
  if (maxZIndex < 9999) {
    issues.push(`❌ z-index値が低すぎます: ${maxZIndex}`);
    solutions.push('z-indexを9999999以上に設定');
  } else {
    console.log(`  ✅ z-index値は十分高い: ${maxZIndex}`);
  }
}

// transform問題チェック
if (hasTransformNone) {
  issues.push('❌ transform: none が存在（MUIを破壊）');
  solutions.push('globals.cssからtransform: noneを削除');
}

// 5. 結果表示
console.log('\n📊 診断結果:');
console.log('='.repeat(60));

if (issues.length === 0) {
  console.log('✅ コード上の問題は見つかりませんでした');
  console.log('\n考えられる原因:');
  console.log('  1. ブラウザキャッシュの問題');
  console.log('  2. ビルドキャッシュの問題');
  console.log('  3. 実行時のJavaScriptエラー');
  console.log('\n推奨アクション:');
  console.log('  1. npm run clean && npm run dev');
  console.log('  2. ブラウザのキャッシュをクリア');
  console.log('  3. ブラウザの開発者ツールでコンソールエラーを確認');
} else {
  console.log('❌ 問題が見つかりました:\n');
  issues.forEach((issue, i) => {
    console.log(`  ${issue}`);
    console.log(`  💡 解決策: ${solutions[i]}`);
  });
}

// 6. テスト用HTMLの案内
console.log('\n🧪 手動テスト:');
console.log('='.repeat(60));
console.log('ブラウザで以下のURLを開いてテストしてください:');
console.log('  http://localhost:3000/test-report.html');
console.log('\nテスト手順:');
console.log('  1. "メニューを開く" ボタンをクリック');
console.log('  2. "テスト実行" ボタンをクリック');
console.log('  3. 結果を確認');

console.log('\n✨ 診断完了\n');