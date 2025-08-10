import { Page } from '@playwright/test';

export class AuthSelectors {
  static errorMessage = '.error-message, .MuiAlert-standardError, [role="alert"]';
  static successMessage = '.success-message, .MuiAlert-standardSuccess, [role="status"]';
  static fieldError = (field: string) => `#${field}-helper-text, .field-error, [data-field="${field}"] .error`;
  static passwordStrength = '[data-strength], .password-strength-container';
  static submitButton = 'button[type="submit"]';
  static loadingIndicator = '.loading, .MuiCircularProgress-root, [role="progressbar"]';
  static emailInput = 'input[name="email"]';
  static passwordInput = 'input[name="password"]';
  static confirmPasswordInput = 'input[name="confirmPassword"]';
  static nameInput = 'input[name="name"]';
}

export async function waitForAuthPage(page: Page, type: 'signup' | 'signin' | 'verify') {
  const patterns = {
    signup: /新規登録|sign up|register|アカウント作成/i,
    signin: /ログイン|sign in|おかえり|welcome/i,
    verify: /メール|確認|verify/i,
  };
  
  await page.waitForSelector('h1, h2', { timeout: 5000 });
  const heading = await page.textContent('h1, h2');
  
  if (!patterns[type].test(heading || '')) {
    console.warn(`Expected ${type} page but got: ${heading}`);
  }
  
  return heading;
}

export async function getErrorMessage(page: Page): Promise<string | null> {
  const element = await page.$(AuthSelectors.errorMessage);
  return element ? await element.textContent() : null;
}

export async function getSuccessMessage(page: Page): Promise<string | null> {
  const element = await page.$(AuthSelectors.successMessage);
  return element ? await element.textContent() : null;
}

export async function getFieldError(page: Page, fieldName: string): Promise<string | null> {
  const selector = AuthSelectors.fieldError(fieldName);
  const element = await page.$(selector);
  return element ? await element.textContent() : null;
}

export async function fillSignupForm(
  page: Page,
  data: {
    name?: string;
    email: string;
    password: string;
    confirmPassword?: string;
  }
) {
  if (data.name) {
    await page.fill(AuthSelectors.nameInput, data.name);
  }
  await page.fill(AuthSelectors.emailInput, data.email);
  await page.fill(AuthSelectors.passwordInput, data.password);
  await page.fill(AuthSelectors.confirmPasswordInput, data.confirmPassword || data.password);
}

export async function fillSigninForm(
  page: Page,
  data: {
    email: string;
    password: string;
  }
) {
  await page.fill(AuthSelectors.emailInput, data.email);
  await page.fill(AuthSelectors.passwordInput, data.password);
}

export async function submitForm(page: Page) {
  await page.click(AuthSelectors.submitButton);
}

export async function waitForLoading(page: Page, state: 'attached' | 'detached' | 'visible' | 'hidden' = 'hidden') {
  await page.waitForSelector(AuthSelectors.loadingIndicator, { 
    state,
    timeout: 10000 
  });
}