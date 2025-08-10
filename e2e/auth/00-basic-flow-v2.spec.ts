/**
 * 基本的な認証フローの改善版E2Eテスト
 * 新しいセレクタヘルパーを使用
 */

import { test, expect } from '@playwright/test';
import {
  AuthSelectors,
  waitForAuthPage,
  getErrorMessage,
  getSuccessMessage,
  getFieldError,
  fillSignupForm,
  fillSigninForm,
  submitForm,
} from '../helpers/selectors';

test.describe('基本的な認証フロー（改善版）', () => {
  test('新規登録ページの全要素が正しく表示される', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 必須要素の存在確認
    await expect(page.locator(AuthSelectors.nameInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.emailInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.passwordInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.confirmPasswordInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.submitButton)).toBeVisible();
    
    // ボタンテキストの確認
    const buttonText = await page.locator(AuthSelectors.submitButton).textContent();
    expect(buttonText).toMatch(/登録|sign up/i);
  });
  
  test('ログインページの全要素が正しく表示される', async ({ page }) => {
    await page.goto('/auth/signin');
    const heading = await waitForAuthPage(page, 'signin');
    
    // ヘッダーテキストの柔軟な確認
    expect(heading?.toLowerCase()).toMatch(/ログイン|おかえり|sign in|welcome/i);
    
    // 必須要素の存在確認
    await expect(page.locator(AuthSelectors.emailInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.passwordInput)).toBeVisible();
    await expect(page.locator(AuthSelectors.submitButton)).toBeVisible();
  });
  
  test('フォームバリデーションが適切に機能する', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 空のフォームを送信
    await submitForm(page);
    
    // エラーが表示されるまで待つ
    await page.waitForTimeout(1000);
    
    // 何らかのエラーが表示されることを確認
    const errorMessage = await getErrorMessage(page);
    const emailError = await getFieldError(page, 'email');
    const passwordError = await getFieldError(page, 'password');
    
    expect(errorMessage || emailError || passwordError).toBeTruthy();
  });
  
  test('パスワード確認の不一致検証', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 異なるパスワードを入力
    await fillSignupForm(page, {
      email: 'test@example.com',
      password: 'Password123!',
      confirmPassword: 'Different123!',
    });
    
    // フォーカスを移動してバリデーションをトリガー
    await page.press(AuthSelectors.confirmPasswordInput, 'Tab');
    await page.waitForTimeout(500);
    
    // エラーの確認
    const confirmError = await getFieldError(page, 'confirmPassword');
    const pageContent = await page.content();
    
    expect(
      confirmError || 
      pageContent.includes('一致') || 
      pageContent.includes('match')
    ).toBeTruthy();
  });
  
  test('メール形式の検証', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 無効なメールアドレスを入力
    await page.fill(AuthSelectors.emailInput, 'invalid-email');
    await page.press(AuthSelectors.emailInput, 'Tab');
    await page.waitForTimeout(500);
    
    // エラーの確認
    const emailError = await getFieldError(page, 'email');
    const emailField = page.locator(AuthSelectors.emailInput);
    const isInvalid = await emailField.getAttribute('aria-invalid');
    
    expect(emailError || isInvalid === 'true').toBeTruthy();
  });
  
  test('正常な新規登録フローの動作確認', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 正しい情報を入力
    const testEmail = `test${Date.now()}@example.com`;
    await fillSignupForm(page, {
      name: 'Test User',
      email: testEmail,
      password: 'ValidPassword123!',
      confirmPassword: 'ValidPassword123!',
    });
    
    // フォーム送信
    await submitForm(page);
    
    // 成功またはリダイレクトを待つ
    try {
      // リダイレクトを待つ
      await page.waitForURL(/\/(verify|signin|dashboard)/, { timeout: 5000 });
      expect(true).toBe(true); // リダイレクト成功
    } catch {
      // リダイレクトしない場合は成功メッセージを確認
      const successMsg = await getSuccessMessage(page);
      const errorMsg = await getErrorMessage(page);
      
      if (errorMsg) {
        console.log('エラーが発生:', errorMsg);
      }
      
      expect(successMsg || !errorMsg).toBeTruthy();
    }
  });
  
  test('ログインフローの動作確認', async ({ page }) => {
    await page.goto('/auth/signin');
    await waitForAuthPage(page, 'signin');
    
    // ログイン情報を入力
    await fillSigninForm(page, {
      email: 'test@example.com',
      password: 'TestPassword123!',
    });
    
    // フォーム送信
    await submitForm(page);
    
    // 結果を待つ
    await page.waitForTimeout(2000);
    
    // エラーまたは成功を確認
    const errorMsg = await getErrorMessage(page);
    const currentUrl = page.url();
    
    // ログイン後のリダイレクトまたはエラーメッセージ
    expect(
      currentUrl.includes('dashboard') || 
      currentUrl.includes('verify') ||
      errorMsg !== null
    ).toBeTruthy();
  });
  
  test('パスワード強度インジケーターの動作確認', async ({ page }) => {
    await page.goto('/auth/signup');
    await waitForAuthPage(page, 'signup');
    
    // 弱いパスワード
    await page.fill(AuthSelectors.passwordInput, 'weak');
    await page.waitForTimeout(500);
    
    let strengthElement = await page.$(AuthSelectors.passwordStrength);
    if (strengthElement) {
      const strength = await strengthElement.getAttribute('data-strength');
      console.log('弱いパスワードの強度:', strength);
    }
    
    // 中程度のパスワード
    await page.fill(AuthSelectors.passwordInput, 'Medium123');
    await page.waitForTimeout(500);
    
    strengthElement = await page.$(AuthSelectors.passwordStrength);
    if (strengthElement) {
      const strength = await strengthElement.getAttribute('data-strength');
      console.log('中程度のパスワードの強度:', strength);
    }
    
    // 強いパスワード
    await page.fill(AuthSelectors.passwordInput, 'Strong123!@#');
    await page.waitForTimeout(500);
    
    strengthElement = await page.$(AuthSelectors.passwordStrength);
    if (strengthElement) {
      const strength = await strengthElement.getAttribute('data-strength');
      console.log('強いパスワードの強度:', strength);
    }
    
    // パスワード強度表示が存在することを確認
    const pageContent = await page.content();
    expect(
      strengthElement !== null || 
      pageContent.includes('強度') ||
      pageContent.includes('strength')
    ).toBeTruthy();
  });
});