import { test, expect } from '@playwright/test';

const TEST_URL = 'http://localhost:3000';

test.describe('Phase 1: ログアウトサニタイゼーション修正検証', () => {
  test('callbackUrlが無限ループしないことを確認', async ({ page }) => {
    console.log('🔍 修正検証開始');
    
    // Step 1: callbackUrl付きでサインインページにアクセス
    console.log('Step 1: callbackUrl付きアクセス');
    await page.goto(`${TEST_URL}/auth/signin?callbackUrl=/dashboard`);
    await page.waitForLoadState('networkidle');
    
    // URLが無限ループでエンコードされていないことを確認
    const currentUrl = page.url();
    console.log('現在のURL:', currentUrl);
    
    // URLパラメータを解析
    const url = new URL(currentUrl);
    const callbackUrl = url.searchParams.get('callbackUrl');
    console.log('callbackUrlパラメータ:', callbackUrl);
    
    // アサーション: callbackUrlが正常な値であること
    expect(callbackUrl).toBe('/dashboard');
    expect(callbackUrl).not.toContain('&amp;');
    expect(callbackUrl).not.toContain('&#x2F;');
    
    console.log('✅ callbackUrlのサニタイゼーション除外が正常に動作');
  });
  
  test('他のパラメータは引き続きサニタイズされることを確認', async ({ page }) => {
    console.log('🔍 他パラメータのサニタイズ確認');
    
    // XSS試行を含むパラメータでアクセス
    const xssAttempt = '<script>alert("xss")</script>';
    await page.goto(`${TEST_URL}/?test=${encodeURIComponent(xssAttempt)}`);
    await page.waitForLoadState('networkidle');
    
    // URLを確認
    const currentUrl = page.url();
    const url = new URL(currentUrl);
    const testParam = url.searchParams.get('test');
    
    console.log('testパラメータ:', testParam);
    
    // サニタイズされていることを確認
    expect(testParam).not.toContain('<script>');
    expect(testParam).not.toContain('alert');
    
    console.log('✅ 他のパラメータは正常にサニタイズされている');
  });
  
  test('ダッシュボードへのリダイレクトフロー確認', async ({ page }) => {
    console.log('🔍 リダイレクトフロー確認');
    
    // 保護されたページに未認証でアクセス
    await page.goto(`${TEST_URL}/dashboard`);
    
    // サインインページにリダイレクトされることを確認
    await page.waitForURL(/\/auth\/signin/);
    
    const currentUrl = page.url();
    console.log('リダイレクト後のURL:', currentUrl);
    
    // callbackUrlが設定されていることを確認
    const url = new URL(currentUrl);
    const callbackUrl = url.searchParams.get('callbackUrl');
    
    expect(callbackUrl).toBe('/dashboard');
    expect(currentUrl).not.toContain('&amp;');
    
    // リダイレクトが複数回発生していないことを確認（ネットワークログ）
    const logs: string[] = [];
    page.on('response', response => {
      if (response.status() >= 300 && response.status() < 400) {
        logs.push(`Redirect: ${response.url()}`);
      }
    });
    
    // ページをリロードして再度確認
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    console.log('リダイレクト回数:', logs.length);
    expect(logs.length).toBeLessThan(3); // 3回未満のリダイレクト
    
    console.log('✅ リダイレクトループが発生していない');
  });
  
  test('クロスオリジンcallbackUrlが除去されることを確認', async ({ page }) => {
    console.log('🔍 クロスオリジン保護確認');
    
    // 外部URLをcallbackUrlに設定
    const externalUrl = 'https://evil.com/steal';
    await page.goto(`${TEST_URL}/auth/signin?callbackUrl=${encodeURIComponent(externalUrl)}`);
    await page.waitForLoadState('networkidle');
    
    // URLを確認
    const currentUrl = page.url();
    const url = new URL(currentUrl);
    const callbackUrl = url.searchParams.get('callbackUrl');
    
    console.log('callbackUrlパラメータ:', callbackUrl);
    
    // クロスオリジンURLが除去されていることを確認
    expect(callbackUrl).toBeNull();
    
    console.log('✅ クロスオリジンcallbackUrlが正常に除去された');
  });
});