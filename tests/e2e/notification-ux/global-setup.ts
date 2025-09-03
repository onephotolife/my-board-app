/**
 * グローバルセットアップ
 * STRICT120準拠
 */

import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('[GLOBAL_SETUP] 開始時刻:', new Date().toISOString());
  console.log('[GLOBAL_SETUP] 環境変数確認:');
  console.log('  - AUTH_EMAIL:', process.env.AUTH_EMAIL ? '設定済み' : '未設定');
  console.log('  - AUTH_PASSWORD:', process.env.AUTH_PASSWORD ? '設定済み' : '未設定');
  console.log('  - MONGODB_URI:', process.env.MONGODB_URI ? '設定済み' : '未設定');
  console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '設定済み' : '未設定');
  console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'http://localhost:3000');
  
  // 必須環境変数のチェック
  const requiredEnvVars = ['AUTH_EMAIL', 'AUTH_PASSWORD'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    console.error('[GLOBAL_SETUP] ❌ 必須環境変数が不足:', missingVars);
    throw new Error(`必須環境変数が未設定: ${missingVars.join(', ')}`);
  }
  
  // STRICT120認証情報の検証
  if (process.env.AUTH_EMAIL !== 'one.photolife+1@gmail.com') {
    console.error('[GLOBAL_SETUP] ❌ 認証メールアドレスが不正です');
    throw new Error('STRICT120準拠: 認証メールアドレスは one.photolife+1@gmail.com である必要があります');
  }
  
  console.log('[GLOBAL_SETUP] ✅ セットアップ完了');
  
  return async () => {
    console.log('[GLOBAL_TEARDOWN] クリーンアップ完了:', new Date().toISOString());
  };
}

export default globalSetup;