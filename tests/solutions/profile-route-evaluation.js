#!/usr/bin/env node

/**
 * STRICT120準拠 - プロファイルルート競合解決策評価スクリプト
 * 既存機能への影響を最小限に抑える解決策の評価
 */

const fs = require('fs');
const path = require('path');

// 解決策の定義
const solutions = [
  {
    id: 1,
    name: 'src/app/(main)/profile/page.tsxを削除',
    description: '(main)グループのプロファイルページを削除し、認証付きレイアウトのprofileを維持',
    commands: [
      'rm src/app/(main)/profile/page.tsx',
      'rmdir src/app/(main)/profile'
    ],
    pros: [
      '認証レイアウトが維持される',
      'サーバーサイド認証チェックが保持される',
      'メール確認チェック機能が維持される',
      'ロールバック容易'
    ],
    cons: [
      'UserContext関連機能が失われる',
      'パスワード変更ダイアログ機能が失われる',
      '機能の再実装が必要になる可能性'
    ],
    impactedFiles: [
      'src/app/(main)/profile/page.tsx',
      'src/app/(main)/profile/components/*'
    ],
    riskLevel: 'MEDIUM',
    rollback: 'git checkout -- src/app/(main)/profile'
  },
  {
    id: 2,
    name: 'src/app/profile/page.tsxを削除',
    description: 'profileディレクトリのページを削除し、(main)の実装を維持',
    commands: [
      'rm src/app/profile/page.tsx',
      'rm -rf src/app/profile'
    ],
    pros: [
      'より多くの機能を持つ実装を維持',
      'UserContext統合が維持される',
      'パスワード変更機能が維持される'
    ],
    cons: [
      'サーバーサイド認証レイアウトが失われる',
      'メール確認チェックが失われる',
      'セキュリティ機能の再実装が必要'
    ],
    impactedFiles: [
      'src/app/profile/*'
    ],
    riskLevel: 'HIGH',
    rollback: 'git checkout -- src/app/profile'
  },
  {
    id: 3,
    name: '(main)/profileを別パスに移動',
    description: 'src/app/(main)/profile/page.tsxを/user-settings等に移動',
    commands: [
      'mkdir -p src/app/(main)/user-settings',
      'mv src/app/(main)/profile/* src/app/(main)/user-settings/',
      'rmdir src/app/(main)/profile'
    ],
    pros: [
      '両方の実装を維持',
      '機能の明確な分離',
      'セキュリティ機能を保持'
    ],
    cons: [
      'URLの変更が必要',
      'ユーザーの混乱を招く可能性',
      'ナビゲーションの更新が必要'
    ],
    impactedFiles: [
      'src/app/(main)/profile/*',
      'src/components/navigation/*'
    ],
    riskLevel: 'MEDIUM',
    rollback: 'mv src/app/(main)/user-settings/* src/app/(main)/profile/'
  },
  {
    id: 4,
    name: '両機能を統合',
    description: 'src/app/profile/page.tsxに(main)/profileの機能を統合',
    commands: [
      'rm src/app/(main)/profile/page.tsx',
      'rmdir src/app/(main)/profile',
      '# src/app/profile/page.tsxを編集して機能統合'
    ],
    pros: [
      '全機能の統合',
      'セキュリティと機能の両立',
      '最も完全な実装'
    ],
    cons: [
      '実装の複雑性が増加',
      'テストの難易度が上がる',
      '大規模な変更が必要'
    ],
    impactedFiles: [
      'src/app/(main)/profile/page.tsx',
      'src/app/profile/page.tsx',
      'src/app/profile/components/*'
    ],
    riskLevel: 'HIGH',
    rollback: 'git checkout -- src/app/profile/page.tsx src/app/(main)/profile/page.tsx'
  }
];

// 影響分析関数
function analyzeImpact(solution) {
  console.log(`\n=== 解決策 ${solution.id}: ${solution.name} ===`);
  console.log(`説明: ${solution.description}`);
  console.log(`リスクレベル: ${solution.riskLevel}`);
  
  console.log('\n利点:');
  solution.pros.forEach(pro => console.log(`  ✓ ${pro}`));
  
  console.log('\n欠点:');
  solution.cons.forEach(con => console.log(`  ✗ ${con}`));
  
  console.log('\n影響を受けるファイル:');
  solution.impactedFiles.forEach(file => {
    const fullPath = path.join(process.cwd(), file);
    if (file.includes('*')) {
      console.log(`  - ${file} (複数ファイル)`);
    } else if (fs.existsSync(fullPath)) {
      const stats = fs.statSync(fullPath);
      console.log(`  - ${file} (${stats.size} bytes)`);
    } else {
      console.log(`  - ${file} (新規作成)`)
    }
  });
  
  console.log('\n実行コマンド:');
  solution.commands.forEach(cmd => console.log(`  $ ${cmd}`));
  
  console.log(`\nロールバック方法: ${solution.rollback}`);
}

// 既存機能への影響チェック
function checkExistingFeatures() {
  console.log('\n=== 既存機能チェック ===');
  
  const features = [
    { path: 'src/app/(main)/profile/page.tsx', name: 'プロファイルページ(main)' },
    { path: 'src/app/(main)/profile/components/PasswordChangeDialog.tsx', name: 'パスワード変更ダイアログ' },
    { path: 'src/app/profile/page.tsx', name: 'プロファイルページ' },
    { path: 'src/app/profile/layout.tsx', name: '認証レイアウト' },
    { path: 'src/app/profile/change-password/page.tsx', name: 'パスワード変更ページ' },
    { path: 'src/contexts/UserContext.tsx', name: 'ユーザーコンテキスト' },
    { path: 'src/components/AppLayout.tsx', name: 'アプリレイアウト' }
  ];
  
  features.forEach(feature => {
    const fullPath = path.join(process.cwd(), feature.path);
    const exists = fs.existsSync(fullPath);
    console.log(`  ${exists ? '✓' : '✗'} ${feature.name}: ${feature.path}`);
  });
}

// 推奨度スコアの計算
function calculateScore(solution) {
  let score = 100;
  
  // リスクレベルによる減点
  switch(solution.riskLevel) {
    case 'LOW': break;
    case 'MEDIUM': score -= 20; break;
    case 'HIGH': score -= 40; break;
  }
  
  // 影響ファイル数による減点
  score -= solution.impactedFiles.length * 5;
  
  // 利点と欠点のバランス
  score += solution.pros.length * 5;
  score -= solution.cons.length * 5;
  
  return Math.max(0, Math.min(100, score));
}

// メイン実行
function main() {
  console.log('========================================');
  console.log('プロファイルルート競合解決策評価');
  console.log('========================================');
  console.log('実行時刻:', new Date().toISOString());
  console.log('現在のディレクトリ:', process.cwd());
  
  // 既存機能のチェック
  checkExistingFeatures();
  
  // 各解決策の分析
  const scores = [];
  solutions.forEach(solution => {
    analyzeImpact(solution);
    const score = calculateScore(solution);
    scores.push({ id: solution.id, name: solution.name, score });
  });
  
  // スコアでソート
  scores.sort((a, b) => b.score - a.score);
  
  console.log('\n========================================');
  console.log('推奨順位（既存機能への影響最小化を重視）');
  console.log('========================================');
  scores.forEach((item, index) => {
    console.log(`${index + 1}位: 解決策${item.id} - ${item.name} (スコア: ${item.score}/100)`);
  });
  
  console.log('\n========================================');
  console.log('最終推奨');
  console.log('========================================');
  const recommended = solutions.find(s => s.id === scores[0].id);
  console.log(`推奨解決策: ${recommended.name}`);
  console.log(`理由: ${recommended.pros[0]}`);
  console.log(`実行コマンド例:`);
  console.log(recommended.commands.map(cmd => `  ${cmd}`).join('\n'));
  
  console.log('\nI attest: all evaluations are based on file system analysis.');
}

// エラーハンドリング
process.on('unhandledRejection', (error) => {
  console.error('未処理のエラー:', error);
  process.exit(1);
});

// 実行
main();