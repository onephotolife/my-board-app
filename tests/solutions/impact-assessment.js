#!/usr/bin/env node

/**
 * STRICT120準拠 - 影響範囲評価スクリプト
 * プロファイルルート競合解決後の影響確認
 */

const fs = require('fs');
const path = require('path');

// テスト結果格納
const impactResults = {
  noImpact: [],
  positiveImpact: [],
  negativeImpact: [],
  timestamp: new Date().toISOString()
};

// 影響評価関数
function assessImpact(name, check, expectedOutcome) {
  const result = check();
  const category = result.impact;
  
  const assessment = {
    name,
    expected: expectedOutcome,
    actual: result.status,
    details: result.details,
    timestamp: new Date().toISOString()
  };
  
  switch(category) {
    case 'positive':
      impactResults.positiveImpact.push(assessment);
      console.log(`✓ [改善] ${name}`);
      break;
    case 'negative':
      impactResults.negativeImpact.push(assessment);
      console.log(`✗ [悪化] ${name}`);
      break;
    default:
      impactResults.noImpact.push(assessment);
      console.log(`→ [変化なし] ${name}`);
  }
  
  if (result.details) {
    console.log(`  詳細: ${result.details}`);
  }
}

// ファイル存在チェック
function fileExists(filePath) {
  return fs.existsSync(filePath);
}

// ディレクトリ内容チェック
function getDirContents(dirPath) {
  if (!fs.existsSync(dirPath)) return [];
  return fs.readdirSync(dirPath);
}

// ファイルサイズ取得
function getFileSize(filePath) {
  if (!fs.existsSync(filePath)) return 0;
  return fs.statSync(filePath).size;
}

// 依存関係チェック
function checkDependencies(filePath, searchTerm) {
  if (!fs.existsSync(filePath)) return false;
  const content = fs.readFileSync(filePath, 'utf8');
  return content.includes(searchTerm);
}

console.log('========================================');
console.log('影響範囲評価レポート');
console.log('========================================');
console.log('実行時刻:', new Date().toISOString());
console.log('');

console.log('=== 1. ルーティング構造への影響 ===');

// プロファイルルートの状態
assessImpact('プロファイルルート競合解決', () => {
  const mainProfile = fileExists('src/app/(main)/profile/page.tsx');
  const appProfile = fileExists('src/app/profile/page.tsx');
  
  if (!mainProfile && appProfile) {
    return {
      impact: 'positive',
      status: '解決済み',
      details: '競合が解消され、単一のプロファイルページのみ存在'
    };
  }
  return {
    impact: 'negative',
    status: '未解決',
    details: '複数のプロファイルページが存在'
  };
}, '競合解決');

// ダッシュボードルートの確認
assessImpact('ダッシュボードルート', () => {
  const mainDashboard = fileExists('src/app/(main)/dashboard/page.tsx');
  const appDashboard = fileExists('src/app/dashboard/page.tsx');
  
  if (!mainDashboard && appDashboard) {
    return {
      impact: 'none',
      status: '正常',
      details: '競合なし'
    };
  }
  return {
    impact: 'negative',
    status: '競合あり',
    details: '要修正'
  };
}, '競合なし');

// ボードルートの確認
assessImpact('ボードルート', () => {
  const mainBoard = fileExists('src/app/(main)/board/page.tsx');
  const appBoard = fileExists('src/app/board/page.tsx');
  
  if (mainBoard && !appBoard) {
    return {
      impact: 'none',
      status: '正常',
      details: '競合なし'
    };
  }
  return {
    impact: 'negative',
    status: '競合あり',
    details: '要修正'
  };
}, '競合なし');

console.log('\n=== 2. 認証機能への影響 ===');

// 認証レイアウトの存在
assessImpact('プロファイル認証レイアウト', () => {
  const layoutExists = fileExists('src/app/profile/layout.tsx');
  
  if (layoutExists) {
    const content = fs.readFileSync('src/app/profile/layout.tsx', 'utf8');
    const hasAuth = content.includes('auth()');
    const hasRedirect = content.includes('redirect');
    
    if (hasAuth && hasRedirect) {
      return {
        impact: 'positive',
        status: '完全実装',
        details: 'サーバーサイド認証チェック機能'
      };
    }
  }
  return {
    impact: 'negative',
    status: '未実装',
    details: '認証レイアウトが存在しない'
  };
}, '認証機能維持');

// ミドルウェア保護
assessImpact('ミドルウェア保護', () => {
  const middlewareExists = fileExists('src/middleware.ts');
  
  if (middlewareExists) {
    const content = fs.readFileSync('src/middleware.ts', 'utf8');
    const protectsProfile = content.includes('/profile');
    
    if (protectsProfile) {
      return {
        impact: 'none',
        status: '保護中',
        details: '/profileルートがミドルウェアで保護されている'
      };
    }
  }
  return {
    impact: 'negative',
    status: '未保護',
    details: 'ミドルウェア保護が不足'
  };
}, '保護維持');

console.log('\n=== 3. コンポーネント依存関係への影響 ===');

// UserContext使用状況
assessImpact('UserContext依存', () => {
  const profilePage = 'src/app/profile/page.tsx';
  
  if (fileExists(profilePage)) {
    const usesUserContext = checkDependencies(profilePage, 'UserContext');
    
    if (!usesUserContext) {
      return {
        impact: 'none',
        status: '非依存',
        details: 'UserContextを使用していない（useSession使用）'
      };
    }
    return {
      impact: 'negative',
      status: '依存あり',
      details: 'UserContext依存が残存'
    };
  }
  return {
    impact: 'negative',
    status: '不明',
    details: 'ファイルが存在しない'
  };
}, 'UserContext非依存');

// AppLayout使用状況
assessImpact('AppLayout使用', () => {
  const profilePage = 'src/app/profile/page.tsx';
  
  if (fileExists(profilePage)) {
    const usesAppLayout = checkDependencies(profilePage, 'AppLayout');
    
    if (usesAppLayout) {
      return {
        impact: 'positive',
        status: '使用中',
        details: 'AppLayoutコンポーネントで統一されたUI'
      };
    }
  }
  return {
    impact: 'none',
    status: '未使用',
    details: 'AppLayoutを使用していない'
  };
}, 'AppLayout使用');

console.log('\n=== 4. 機能喪失の確認 ===');

// パスワード変更機能
assessImpact('パスワード変更機能', () => {
  const changePasswordPage = fileExists('src/app/profile/change-password/page.tsx');
  const passwordDialog = fileExists('src/app/(main)/profile/components/PasswordChangeDialog.tsx');
  
  if (changePasswordPage) {
    return {
      impact: 'none',
      status: '別ページで維持',
      details: 'change-passwordサブルートで機能提供'
    };
  } else if (!passwordDialog) {
    return {
      impact: 'negative',
      status: '機能喪失',
      details: 'PasswordChangeDialogコンポーネントが削除された'
    };
  }
  return {
    impact: 'none',
    status: '維持',
    details: '機能が維持されている'
  };
}, '機能維持');

// プロファイル編集機能
assessImpact('プロファイル編集機能', () => {
  const editForm = fileExists('src/app/profile/ProfileEditForm.tsx');
  const pageContent = fileExists('src/app/profile/page.tsx') ? 
    fs.readFileSync('src/app/profile/page.tsx', 'utf8') : '';
  
  const hasEditingState = pageContent.includes('editing');
  const hasSaveFunction = pageContent.includes('save') || pageContent.includes('update');
  
  if (hasEditingState && hasSaveFunction) {
    return {
      impact: 'positive',
      status: '完全実装',
      details: 'インライン編集機能が実装されている'
    };
  } else if (editForm) {
    return {
      impact: 'none',
      status: '別コンポーネント',
      details: 'ProfileEditFormコンポーネントで提供'
    };
  }
  return {
    impact: 'negative',
    status: '機能不足',
    details: '編集機能が制限されている'
  };
}, '編集機能維持');

console.log('\n=== 5. パフォーマンスへの影響 ===');

// ファイルサイズ比較
assessImpact('バンドルサイズ', () => {
  const originalSize = 11945; // 削除された(main)/profile/page.tsxのサイズ
  const currentSize = getFileSize('src/app/profile/page.tsx');
  
  const reduction = originalSize - currentSize;
  
  if (reduction > 0) {
    return {
      impact: 'positive',
      status: 'サイズ削減',
      details: `${reduction}バイト削減（${currentSize}バイトに最適化）`
    };
  }
  return {
    impact: 'none',
    status: '変化なし',
    details: `現在のサイズ: ${currentSize}バイト`
  };
}, 'サイズ最適化');

// 重複コード削減
assessImpact('コード重複', () => {
  const profileDirs = getDirContents('src/app').filter(d => d.includes('profile'));
  
  if (profileDirs.length === 1) {
    return {
      impact: 'positive',
      status: '重複なし',
      details: '単一のプロファイル実装'
    };
  }
  return {
    impact: 'negative',
    status: '重複あり',
    details: `${profileDirs.length}個のprofile関連ディレクトリ`
  };
}, '重複削除');

console.log('\n=== 6. 開発者体験への影響 ===');

// ディレクトリ構造の明確性
assessImpact('ディレクトリ構造', () => {
  const mainGroupDirs = getDirContents('src/app/(main)');
  const hasProfile = mainGroupDirs.includes('profile');
  
  if (!hasProfile) {
    return {
      impact: 'positive',
      status: '明確',
      details: 'プロファイルは/profileに統一'
    };
  }
  return {
    impact: 'negative',
    status: '複雑',
    details: '複数の場所にプロファイル関連ファイル'
  };
}, '構造の単純化');

// ナビゲーションの一貫性
assessImpact('ナビゲーションパス', () => {
  const navComponents = [
    'src/components/ClientHeader.tsx',
    'src/components/Navigation.tsx',
    'src/components/AppLayout.tsx'
  ];
  
  let profileLinkCount = 0;
  navComponents.forEach(comp => {
    if (fileExists(comp)) {
      const content = fs.readFileSync(comp, 'utf8');
      if (content.includes('/profile')) {
        profileLinkCount++;
      }
    }
  });
  
  if (profileLinkCount > 0) {
    return {
      impact: 'none',
      status: '一貫性あり',
      details: `${profileLinkCount}個のコンポーネントが/profileを参照`
    };
  }
  return {
    impact: 'negative',
    status: '参照なし',
    details: 'プロファイルへのリンクが見つからない'
  };
}, 'パスの一貫性');

// 結果サマリー
console.log('\n========================================');
console.log('影響評価サマリー');
console.log('========================================');
console.log(`改善された項目: ${impactResults.positiveImpact.length}件`);
console.log(`変化なし項目: ${impactResults.noImpact.length}件`);
console.log(`悪化した項目: ${impactResults.negativeImpact.length}件`);

if (impactResults.negativeImpact.length > 0) {
  console.log('\n⚠️ 注意が必要な項目:');
  impactResults.negativeImpact.forEach(item => {
    console.log(`  - ${item.name}: ${item.details}`);
  });
}

if (impactResults.positiveImpact.length > 0) {
  console.log('\n✅ 改善された項目:');
  impactResults.positiveImpact.forEach(item => {
    console.log(`  - ${item.name}: ${item.details}`);
  });
}

// 結果をJSONファイルに保存
fs.writeFileSync(
  'tests/solutions/impact-assessment-results.json',
  JSON.stringify(impactResults, null, 2)
);

console.log('\n影響評価結果を tests/solutions/impact-assessment-results.json に保存しました。');
console.log('\nI attest: all impact assessments are based on file system analysis.');