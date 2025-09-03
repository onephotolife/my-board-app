/**
 * 開発環境用のメール送信サービス
 * コンソールにメール内容を出力する
 */

import type { 
  EmailOptions, 
  EmailSendResult} from '@/types/email';
import {
  EmailTemplateData 
} from '@/types/email';

export class DevEmailService {
  /**
   * 開発環境でメールをコンソールに出力
   */
  static logEmail(options: EmailOptions): EmailSendResult {
    const timestamp = new Date().toISOString();
    const messageId = `dev-${Date.now()}`;

    console.warn('\n' + '='.repeat(60));
    console.warn('📧 [DEV] メール送信シミュレーション');
    console.warn('='.repeat(60));
    console.warn(`📅 日時: ${timestamp}`);
    console.warn(`🆔 メッセージID: ${messageId}`);
    console.warn(`📮 宛先: ${options.to}`);
    console.warn(`📝 件名: ${options.subject}`);
    console.warn(`📤 送信元: ${options.from || 'noreply@board-app.com'}`);
    
    if (options.text) {
      console.warn('\n--- プレーンテキスト ---');
      console.warn(options.text);
    }
    
    if (options.html) {
      console.warn('\n--- HTML (最初の500文字) ---');
      // HTMLタグを簡単に除去して表示
      const textContent = options.html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 500);
      console.warn(textContent);
    }
    
    console.warn('='.repeat(60));
    console.warn('✅ [DEV] メール送信完了（シミュレーション）');
    console.warn('='.repeat(60) + '\n');

    return {
      success: true,
      messageId,
      details: { 
        preview: true,
        environment: 'development',
        timestamp 
      },
    };
  }

  /**
   * 認証メールの詳細ログ
   */
  static logVerificationEmail(
    to: string,
    data: {
      userName: string;
      verificationUrl: string;
      verificationCode?: string;
    }
  ): void {
    console.warn('\n' + '🔐'.repeat(30));
    console.warn('📧 メール認証リンク（開発環境）');
    console.warn('🔐'.repeat(30));
    console.warn(`👤 ユーザー名: ${data.userName}`);
    console.warn(`📮 メールアドレス: ${to}`);
    console.warn(`🔗 認証URL:`);
    console.warn(`   ${data.verificationUrl}`);
    if (data.verificationCode) {
      console.warn(`🔢 認証コード: ${data.verificationCode}`);
    }
    console.warn('⏰ 有効期限: 24時間');
    console.warn('🔐'.repeat(30) + '\n');
    
    // ブラウザで開けるように見やすく表示
    console.warn('👆 上記URLをブラウザで開いて認証を完了してください');
    console.warn('\n');
  }

  /**
   * パスワードリセットメールの詳細ログ
   */
  static logPasswordResetEmail(
    to: string,
    data: {
      userName: string;
      resetUrl: string;
      resetCode?: string;
      expiresIn?: string;
    }
  ): void {
    console.warn('\n' + '🔑'.repeat(30));
    console.warn('📧 パスワードリセットリンク（開発環境）');
    console.warn('🔑'.repeat(30));
    console.warn(`👤 ユーザー名: ${data.userName}`);
    console.warn(`📮 メールアドレス: ${to}`);
    console.warn(`🔗 リセットURL:`);
    console.warn(`   ${data.resetUrl}`);
    if (data.resetCode) {
      console.warn(`🔢 リセットコード: ${data.resetCode}`);
    }
    console.warn(`⏰ 有効期限: ${data.expiresIn || '1時間'}`);
    console.warn('🔑'.repeat(30) + '\n');
  }
}