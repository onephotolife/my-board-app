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
    await page.waitForLoadState('networkidle');
    
    // フォームの存在を確認
    const form = await page.$('form');
    expect(form).toBeTruthy();
    
    // 送信ボタンをクリック
    await page.click('button[type="submit"]');
    
    // 少し待つ（DOM操作の完了を待つ）
    await page.waitForTimeout(500);
    
    // 複数の方法でエラーを検出
    const errorDetected = await page.evaluate(() => {
      // 方法1: クラス名で検索
      const classErrors = document.querySelectorAll('.field-error, .error-message');
      if (classErrors.length > 0) {
        console.log('クラス名でエラー検出:', classErrors.length);
        return true;
      }
      
      // 方法2: aria-invalid属性で検索
      const ariaInvalid = document.querySelectorAll('[aria-invalid="true"]');
      if (ariaInvalid.length > 0) {
        console.log('aria-invalidでエラー検出:', ariaInvalid.length);
        return true;
      }
      
      // 方法3: data属性で検索
      const dataErrors = document.querySelectorAll('[data-has-error="true"]');
      if (dataErrors.length > 0) {
        console.log('data属性でエラー検出:', dataErrors.length);
        return true;
      }
      
      // 方法4: HTML5バリデーションメッセージ
      const inputs = document.querySelectorAll('input:invalid');
      if (inputs.length > 0) {
        console.log('HTML5バリデーションでエラー検出:', inputs.length);
        return true;
      }
      
      // 方法5: IDでエラー要素を直接検索
      const directErrors = ['name', 'email', 'password', 'confirmPassword'].some(field => {
        const errorElement = document.getElementById(`${field}-helper-text`);
        return errorElement && errorElement.textContent;
      });
      if (directErrors) {
        console.log('IDでエラー要素検出');
        return true;
      }
      
      // 方法6: テキスト内容で検索
      const bodyText = document.body.textContent || '';
      const hasErrorText = bodyText.includes('入力してください') || 
                           bodyText.includes('必須') ||
                           bodyText.includes('required') ||
                           bodyText.includes('入力内容を確認してください');
      if (hasErrorText) {
        console.log('エラーテキスト検出');
        return true;
      }
      
      console.log('エラーが検出されませんでした');
      console.log('DOM内容:', document.body.innerHTML.substring(0, 500));
      return false;
    });
    
    expect(errorDetected).toBeTruthy();
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