/**
 * グローバルティアダウン
 * STRICT120準拠
 */

import { FullConfig } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

async function globalTeardown(config: FullConfig) {
  console.log('[GLOBAL_TEARDOWN] 開始時刻:', new Date().toISOString());
  
  // テスト結果の集計
  const resultsDir = path.join(process.cwd(), 'test-results');
  
  try {
    const files = await fs.readdir(resultsDir);
    console.log('[GLOBAL_TEARDOWN] テスト結果ファイル:', files.length, '個');
    
    // 証拠ファイルの確認
    const evidenceFiles = files.filter(f => f.includes('evidence') || f.includes('screenshot'));
    if (evidenceFiles.length > 0) {
      console.log('[GLOBAL_TEARDOWN] 証拠ファイル生成:', evidenceFiles);
    }
    
    // JUnitレポートの存在確認
    if (files.includes('junit.xml')) {
      console.log('[GLOBAL_TEARDOWN] ✅ JUnitレポート生成確認');
    }
    
    // JSONレポートの存在確認
    if (files.includes('results.json')) {
      console.log('[GLOBAL_TEARDOWN] ✅ JSONレポート生成確認');
    }
    
  } catch (error) {
    console.log('[GLOBAL_TEARDOWN] テスト結果ディレクトリが存在しません');
  }
  
  // 認証ファイルのクリーンアップ（オプション）
  const authFile = path.join(process.cwd(), 'tests/e2e/notification-ux/.auth/user.json');
  try {
    await fs.access(authFile);
    console.log('[GLOBAL_TEARDOWN] 認証ファイル保持（次回テスト用）');
  } catch {
    console.log('[GLOBAL_TEARDOWN] 認証ファイルなし');
  }
  
  console.log('[GLOBAL_TEARDOWN] ✅ クリーンアップ完了:', new Date().toISOString());
}

export default globalTeardown;