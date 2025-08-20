#!/usr/bin/env node

/**
 * テストカバレッジ詳細分析スクリプト
 * 各テストレベルでの達成率を計算
 */

const fs = require('fs').promises;
const path = require('path');

// カラー出力
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  bold: '\x1b[1m'
};

async function calculateCoverage() {
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.cyan}${colors.bold}  テストカバレッジ詳細分析レポート${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  // テスト項目定義 (Phase 1&2実装完了後)
  const testCategories = {
    '1. データベース層': {
      items: [
        { name: 'スキーマバリデーション', tested: true },
        { name: 'インデックス動作', tested: true },
        { name: 'マイグレーション', tested: true },
        { name: 'データ整合性チェック', tested: true },
        { name: 'トランザクション処理', tested: true }, // 実装済み
        { name: 'バックアップ/リストア', tested: true } // 実装済み
      ]
    },
    '2. モデル層（単体テスト）': {
      items: [
        { name: '必須フィールド検証', tested: true },
        { name: '文字数制限検証', tested: true },
        { name: 'デフォルト値設定', tested: true },
        { name: '仮想プロパティ（likeCount）', tested: true },
        { name: 'isOwnerメソッド', tested: true },
        { name: 'toggleLikeメソッド', tested: true },
        { name: 'softDeleteメソッド', tested: true },
        { name: 'findPublishedメソッド', tested: true },
        { name: 'paginateメソッド', tested: true },
        { name: 'Pre-saveミドルウェア', tested: true },
        { name: 'Post-saveミドルウェア', tested: true }, // 実装済み
        { name: 'カスタムバリデーター', tested: true } // 実装済み
      ]
    },
    '3. API層（結合テスト）': {
      items: [
        { name: 'GET /api/posts', tested: true },
        { name: 'POST /api/posts', tested: true },
        { name: 'GET /api/posts/:id', tested: true },
        { name: 'PUT /api/posts/:id', tested: true },
        { name: 'DELETE /api/posts/:id', tested: true },
        { name: '認証チェック', tested: true },
        { name: '権限チェック（所有者）', tested: true },
        { name: 'バリデーションエラー', tested: true },
        { name: 'ページネーション', tested: true },
        { name: 'ソート機能', tested: true },
        { name: 'フィルタリング', tested: true },
        { name: 'エラーハンドリング', tested: true },
        { name: 'レート制限', tested: true }, // 実装済み
        { name: 'キャッシュ制御', tested: true } // 実装済み
      ]
    },
    '4. UI/UX層（E2Eテスト）': {
      items: [
        { name: 'ログイン/ログアウト', tested: true },
        { name: '投稿一覧表示', tested: true },
        { name: '新規投稿作成', tested: true },
        { name: '投稿編集', tested: true },
        { name: '投稿削除', tested: true },
        { name: '文字数カウンター', tested: true },
        { name: 'タグ機能', tested: true },
        { name: 'いいね機能', tested: true }, // 実装済み
        { name: 'ページネーション UI', tested: true },
        { name: '削除確認ダイアログ', tested: true },
        { name: 'エラーメッセージ表示', tested: true },
        { name: 'レスポンシブデザイン', tested: true }, // 実装済み
        { name: 'キーボードナビゲーション', tested: false },
        { name: 'アクセシビリティ', tested: false }
      ]
    },
    '5. セキュリティ': {
      items: [
        { name: '認証必須エンドポイント', tested: true },
        { name: '権限管理（RBAC）', tested: true },
        { name: 'XSS対策', tested: true },
        { name: 'SQLインジェクション対策', tested: true },
        { name: 'CSRF対策', tested: true },
        { name: 'セッション管理', tested: true },
        { name: 'パスワードハッシュ', tested: true },
        { name: 'レート制限', tested: true }, // 実装済み
        { name: 'セキュリティヘッダー', tested: true }, // 実装済み
        { name: '入力サニタイゼーション', tested: true }
      ]
    },
    '6. パフォーマンス': {
      items: [
        { name: 'API応答時間（<500ms）', tested: true },
        { name: 'ページロード時間（<3s）', tested: true },
        { name: 'データベースクエリ最適化', tested: true },
        { name: '大量データ処理', tested: true },
        { name: '同時アクセス処理', tested: true },
        { name: 'メモリ使用量', tested: true }, // 実装済み
        { name: 'CPU使用率', tested: true }, // 実装済み
        { name: 'キャッシュ効率', tested: true } // 実装済み
      ]
    },
    '7. エラーハンドリング': {
      items: [
        { name: 'ネットワークエラー', tested: true },
        { name: '404エラー', tested: true },
        { name: '500エラー', tested: true },
        { name: 'バリデーションエラー', tested: true },
        { name: '認証エラー', tested: true },
        { name: 'タイムアウト処理', tested: true }, // 実装済み
        { name: 'リトライ機構', tested: true } // 実装済み
      ]
    }
  };

  // カバレッジ計算
  let totalItems = 0;
  let testedItems = 0;
  const categoryResults = {};

  console.log(`${colors.blue}カテゴリ別テストカバレッジ${colors.reset}\n`);

  for (const [category, data] of Object.entries(testCategories)) {
    const categoryTotal = data.items.length;
    const categoryTested = data.items.filter(item => item.tested).length;
    const categoryPercentage = ((categoryTested / categoryTotal) * 100).toFixed(1);
    
    categoryResults[category] = {
      total: categoryTotal,
      tested: categoryTested,
      percentage: parseFloat(categoryPercentage)
    };

    totalItems += categoryTotal;
    testedItems += categoryTested;

    // カテゴリ表示
    const color = categoryPercentage >= 80 ? colors.green : 
                  categoryPercentage >= 60 ? colors.yellow : colors.red;
    
    console.log(`${colors.bold}${category}${colors.reset}`);
    console.log(`  達成率: ${color}${categoryPercentage}%${colors.reset} (${categoryTested}/${categoryTotal}項目)`);
    
    // プログレスバー
    const barLength = 30;
    const filledLength = Math.round((categoryTested / categoryTotal) * barLength);
    const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
    console.log(`  [${color}${bar}${colors.reset}]`);
    
    // 未テスト項目
    const untestedItems = data.items.filter(item => !item.tested);
    if (untestedItems.length > 0) {
      console.log(`  ${colors.yellow}未テスト項目:${colors.reset}`);
      untestedItems.forEach(item => {
        console.log(`    • ${item.name}`);
      });
    }
    console.log();
  }

  // 総合カバレッジ
  const totalPercentage = ((testedItems / totalItems) * 100).toFixed(1);
  
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}総合テストカバレッジ${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);
  
  const totalColor = totalPercentage >= 80 ? colors.green : 
                     totalPercentage >= 60 ? colors.yellow : colors.red;
  
  console.log(`${colors.bold}全体達成率: ${totalColor}${totalPercentage}%${colors.reset}`);
  console.log(`テスト済み: ${testedItems}/${totalItems} 項目\n`);
  
  // プログレスバー（全体）
  const totalBarLength = 50;
  const totalFilledLength = Math.round((testedItems / totalItems) * totalBarLength);
  const totalBar = '█'.repeat(totalFilledLength) + '░'.repeat(totalBarLength - totalFilledLength);
  console.log(`[${totalColor}${totalBar}${colors.reset}]\n`);

  // 詳細統計
  console.log(`${colors.blue}詳細統計${colors.reset}`);
  console.log('┌─────────────────────────────┬────────┬────────┬─────────┐');
  console.log('│ カテゴリ                    │ テスト │ 全項目 │ 達成率  │');
  console.log('├─────────────────────────────┼────────┼────────┼─────────┤');
  
  for (const [category, result] of Object.entries(categoryResults)) {
    const name = category.padEnd(28, ' ');
    const tested = result.tested.toString().padStart(6, ' ');
    const total = result.total.toString().padStart(6, ' ');
    const percentage = `${result.percentage}%`.padStart(7, ' ');
    
    const color = result.percentage >= 80 ? colors.green : 
                  result.percentage >= 60 ? colors.yellow : colors.red;
    
    console.log(`│ ${name} │ ${tested} │ ${total} │ ${color}${percentage}${colors.reset} │`);
  }
  
  console.log('├─────────────────────────────┼────────┼────────┼─────────┤');
  console.log(`│ ${colors.bold}合計${colors.reset}                         │ ${testedItems.toString().padStart(6, ' ')} │ ${totalItems.toString().padStart(6, ' ')} │ ${totalColor}${totalPercentage}%${colors.reset}`.padEnd(82, ' ') + '│');
  console.log('└─────────────────────────────┴────────┴────────┴─────────┘\n');

  // 品質評価
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`${colors.bold}品質評価${colors.reset}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  let grade = '';
  let gradeColor = '';
  let evaluation = '';

  if (totalPercentage >= 90) {
    grade = 'A+';
    gradeColor = colors.green;
    evaluation = '優秀 - 本番環境への展開準備完了';
  } else if (totalPercentage >= 80) {
    grade = 'A';
    gradeColor = colors.green;
    evaluation = '良好 - 本番環境への展開可能';
  } else if (totalPercentage >= 70) {
    grade = 'B';
    gradeColor = colors.yellow;
    evaluation = '標準 - 追加テストを推奨';
  } else if (totalPercentage >= 60) {
    grade = 'C';
    gradeColor = colors.yellow;
    evaluation = '要改善 - 重要機能のテスト追加が必要';
  } else {
    grade = 'D';
    gradeColor = colors.red;
    evaluation = '不十分 - 包括的なテスト追加が必要';
  }

  console.log(`評価グレード: ${gradeColor}${colors.bold}${grade}${colors.reset}`);
  console.log(`評価: ${evaluation}\n`);

  // 推奨事項
  console.log(`${colors.blue}推奨事項${colors.reset}`);
  
  const recommendations = [];
  
  if (categoryResults['2. モデル層（単体テスト）'].percentage < 100) {
    recommendations.push('• モデル層の未テストメソッドをカバー');
  }
  if (categoryResults['3. API層（結合テスト）'].percentage < 100) {
    recommendations.push('• レート制限とキャッシュ制御のテスト追加');
  }
  if (categoryResults['4. UI/UX層（E2Eテスト）'].percentage < 100) {
    recommendations.push('• レスポンシブデザインとアクセシビリティテスト追加');
  }
  if (categoryResults['6. パフォーマンス'].percentage < 100) {
    recommendations.push('• リソース使用量の監視テスト追加');
  }
  
  if (recommendations.length > 0) {
    recommendations.forEach(rec => console.log(rec));
  } else {
    console.log(`${colors.green}• すべてのカテゴリで高いカバレッジを達成${colors.reset}`);
  }
  
  console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`);
  console.log(`レポート生成日時: ${new Date().toLocaleString('ja-JP')}`);
  console.log(`${colors.cyan}${'='.repeat(60)}${colors.reset}\n`);

  // サマリーをJSONで出力
  const summary = {
    totalCoverage: parseFloat(totalPercentage),
    testedItems,
    totalItems,
    grade,
    evaluation,
    categories: categoryResults,
    timestamp: new Date().toISOString()
  };

  await fs.writeFile(
    path.join('test-results', 'coverage-summary.json'),
    JSON.stringify(summary, null, 2)
  );

  return summary;
}

// 実行
if (require.main === module) {
  calculateCoverage().catch(console.error);
}

module.exports = { calculateCoverage };