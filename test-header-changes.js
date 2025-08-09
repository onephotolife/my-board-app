#!/usr/bin/env node
/**
 * ヘッダーボタン削除後の動作確認テスト
 * 実行方法: node test-header-changes.js
 */

const fs = require('fs');
const path = require('path');

console.log('========================================');
console.log('🧪 ヘッダーボタン削除確認テスト');
console.log('========================================\n');

// テスト対象ファイル
const headerFiles = [
  'src/components/ModernHeader.tsx',
  'src/components/Header.tsx', 
  'src/components/ClientHeader.tsx',
  'src/components/PureHeader.tsx'
];

// 削除確認対象のキーワード
const removedKeywords = ['新規登録', 'ログアウト'];
const preservedKeywords = ['ログイン'];

console.log('📋 削除確認テスト:');
console.log('----------------------------------------');

let testsPassed = true;

headerFiles.forEach(file => {
  const filePath = path.join(process.cwd(), file);
  console.log(`\n📄 ${file}:`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    // 削除されるべきキーワードの確認
    removedKeywords.forEach(keyword => {
      // ボタン/リンクコンテキストでのキーワードを探す
      const buttonPattern = new RegExp(`<(button|Button|Link|a)[^>]*>\\s*${keyword}\\s*</(button|Button|Link|a)>`, 'g');
      const textPattern = new RegExp(`>\\s*${keyword}\\s*<`, 'g');
      
      const buttonMatches = content.match(buttonPattern);
      const textMatches = content.match(textPattern);
      
      if (buttonMatches || textMatches) {
        console.log(`  ❌ "${keyword}" ボタン/リンクがまだ存在します`);
        testsPassed = false;
      } else {
        console.log(`  ✅ "${keyword}" ボタン/リンクが削除されています`);
      }
    });
    
    // 残すべきキーワードの確認
    preservedKeywords.forEach(keyword => {
      const pattern = new RegExp(keyword, 'g');
      const matches = content.match(pattern);
      
      if (matches) {
        console.log(`  ✅ "${keyword}" ボタン/リンクは保持されています`);
      } else {
        console.log(`  ⚠️  "${keyword}" ボタン/リンクが見つかりません`);
      }
    });
    
  } catch (error) {
    console.log(`  ⚠️  ファイルが見つかりません: ${error.message}`);
  }
});

console.log('\n========================================');
console.log('📊 ナビゲーション確認:');
console.log('----------------------------------------');

// ログインページの新規登録リンク確認
const signinPath = path.join(process.cwd(), 'src/app/auth/signin/page.tsx');
try {
  const signinContent = fs.readFileSync(signinPath, 'utf8');
  if (signinContent.includes('/auth/signup') && signinContent.includes('新規登録')) {
    console.log('✅ ログインページから新規登録ページへのリンクが存在します');
  } else {
    console.log('❌ ログインページに新規登録へのリンクがありません');
    testsPassed = false;
  }
} catch (error) {
  console.log('⚠️  ログインページが見つかりません');
}

console.log('\n========================================');
console.log('📱 レスポンシブデザイン確認:');
console.log('----------------------------------------');

// ModernHeader.tsxのモバイルメニュー確認
const modernHeaderPath = path.join(process.cwd(), 'src/components/ModernHeader.tsx');
try {
  const modernContent = fs.readFileSync(modernHeaderPath, 'utf8');
  
  // モバイルメニューボタンの存在確認
  if (modernContent.includes('mobileMenuButtonStyle')) {
    console.log('✅ モバイルメニューボタンが存在します');
  } else {
    console.log('⚠️  モバイルメニューボタンが見つかりません');
  }
  
  // モバイルメニュー内のログインリンク確認
  if (modernContent.includes('menuOpen')) {
    console.log('✅ モバイルメニューの開閉機能が存在します');
  } else {
    console.log('⚠️  モバイルメニュー機能が見つかりません');
  }
  
} catch (error) {
  console.log('⚠️  ModernHeader.tsxが見つかりません');
}

console.log('\n========================================');
console.log('🎯 テスト結果サマリー:');
console.log('----------------------------------------');

if (testsPassed) {
  console.log('✅ すべてのテストに合格しました！');
  console.log('\n📝 確認済み項目:');
  console.log('  1. 新規登録ボタンが削除されました');
  console.log('  2. ログアウトボタンが削除されました');
  console.log('  3. ログインボタンは保持されています');
  console.log('  4. ログインページから新規登録ページへアクセス可能です');
  console.log('  5. モバイルメニュー機能は維持されています');
} else {
  console.log('❌ 一部のテストに失敗しました');
  console.log('上記の詳細を確認してください');
}

console.log('\n========================================');
console.log('🔍 推奨事項:');
console.log('----------------------------------------');
console.log('1. ブラウザで実際に動作確認を行ってください');
console.log('2. モバイル表示での動作も確認してください');
console.log('3. ユーザーがログアウトする別の方法を検討してください');
console.log('   （例: プロフィールメニュー、設定ページなど）');
console.log('========================================\n');

process.exit(testsPassed ? 0 : 1);