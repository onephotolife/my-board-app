/**
 * E2Eテスト用のメール確認ヘルパー
 */

import { Page } from '@playwright/test';

// 開発環境でのメール確認（コンソール出力から取得）
export async function getVerificationUrlFromConsole(page: Page): Promise<string | null> {
  return new Promise((resolve) => {
    // コンソールメッセージを監視
    page.on('console', (msg) => {
      const text = msg.text();
      
      // 認証URLパターンを検出
      const urlMatch = text.match(/http:\/\/localhost:3000\/auth\/verify\?token=[a-f0-9]{64}/);
      if (urlMatch) {
        resolve(urlMatch[0]);
      }
    });
    
    // タイムアウト設定（5秒）
    setTimeout(() => resolve(null), 5000);
  });
}

// メールのモック（テスト用）
export class MockEmailService {
  private sentEmails: Array<{
    to: string;
    subject: string;
    html: string;
    timestamp: Date;
  }> = [];
  
  // メール送信を記録
  async send(to: string, subject: string, html: string) {
    this.sentEmails.push({
      to,
      subject,
      html,
      timestamp: new Date(),
    });
  }
  
  // 送信されたメールを取得
  getEmails(to?: string) {
    if (to) {
      return this.sentEmails.filter(email => email.to === to);
    }
    return this.sentEmails;
  }
  
  // 最新のメールを取得
  getLatestEmail(to?: string) {
    const emails = this.getEmails(to);
    return emails[emails.length - 1] || null;
  }
  
  // 認証URLを抽出
  extractVerificationUrl(email: { html: string }): string | null {
    const match = email.html.match(/href="(http[^"]*\/auth\/verify\?token=[^"]*)"/);
    return match ? match[1] : null;
  }
  
  // メールをクリア
  clear() {
    this.sentEmails = [];
  }
}

// 実際のメール配信確認（本番環境用）
export class EmailVerificationHelper {
  private checkInterval: number = 1000; // 1秒ごとにチェック
  private maxRetries: number = 30; // 最大30回（30秒）
  
  // メール受信を待つ
  async waitForEmail(
    checkFunction: () => Promise<boolean>,
    timeout: number = 30000
  ): Promise<boolean> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const received = await checkFunction();
      if (received) {
        return true;
      }
      
      await this.sleep(this.checkInterval);
    }
    
    return false;
  }
  
  // スリープヘルパー
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// テスト用メールアドレス生成
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(7);
  return `test-${timestamp}-${random}@example.com`;
}

// メール内容の検証
export function validateEmailContent(html: string, expectedFields: {
  userName?: string;
  verificationUrl?: string;
  resetUrl?: string;
}): boolean {
  let isValid = true;
  
  if (expectedFields.userName) {
    isValid = isValid && html.includes(expectedFields.userName);
  }
  
  if (expectedFields.verificationUrl) {
    isValid = isValid && html.includes(expectedFields.verificationUrl);
  }
  
  if (expectedFields.resetUrl) {
    isValid = isValid && html.includes(expectedFields.resetUrl);
  }
  
  return isValid;
}