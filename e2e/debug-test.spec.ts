import { test, expect } from '@playwright/test';

test('デバッグ: 空フォーム送信時のバリデーション', async ({ page }) => {
  // ページに移動
  await page.goto('/auth/signup');
  
  // ページが完全に読み込まれるまで待つ
  await page.waitForLoadState('networkidle');
  
  // フォーム要素の存在確認
  const nameInput = await page.$('input[name="name"]');
  const emailInput = await page.$('input[name="email"]');
  const passwordInput = await page.$('input[name="password"]');
  const submitButton = await page.$('button[type="submit"]');
  
  console.log('フォーム要素の存在:', {
    name: !!nameInput,
    email: !!emailInput,
    password: !!passwordInput,
    submit: !!submitButton
  });
  
  // 送信ボタンをクリック
  await submitButton?.click();
  
  // 少し待つ
  await page.waitForTimeout(1000);
  
  // ページの内容を確認
  const pageContent = await page.content();
  
  // エラー関連の要素を探す
  const hasFieldError = pageContent.includes('field-error');
  const hasErrorMessage = pageContent.includes('error-message');
  const hasAriaInvalid = pageContent.includes('aria-invalid="true"');
  const hasHelperText = pageContent.includes('helper-text');
  
  console.log('エラー要素の存在:', {
    fieldError: hasFieldError,
    errorMessage: hasErrorMessage,
    ariaInvalid: hasAriaInvalid,
    helperText: hasHelperText
  });
  
  // 各入力フィールドのaria-invalid属性を確認
  const nameAriaInvalid = await nameInput?.getAttribute('aria-invalid');
  const emailAriaInvalid = await emailInput?.getAttribute('aria-invalid');
  const passwordAriaInvalid = await passwordInput?.getAttribute('aria-invalid');
  
  console.log('aria-invalid属性:', {
    name: nameAriaInvalid,
    email: emailAriaInvalid,
    password: passwordAriaInvalid
  });
  
  // 任意のテキストでエラーメッセージを探す
  const allTexts = await page.$$eval('*', elements => {
    return elements
      .filter(el => el.textContent && el.textContent.includes('入力'))
      .map(el => ({
        tag: el.tagName,
        class: el.className,
        text: el.textContent?.trim()
      }))
      .slice(0, 10); // 最初の10個まで
  });
  
  console.log('「入力」を含むテキスト:', allTexts);
  
  // テスト結果
  expect(hasFieldError || hasErrorMessage || hasAriaInvalid).toBeTruthy();
});