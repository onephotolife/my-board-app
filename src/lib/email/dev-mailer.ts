/**
 * 開発環境用のメール送信サービス
 * コンソールにメール内容を出力する
 */

import { 
  EmailOptions, 
  EmailSendResult,
  EmailTemplateData 
} from '@/types/email';

export class DevEmailService {
  /**
   * 開発環境でメールをコンソールに出力
   */
  static logEmail(options: EmailOptions): EmailSendResult {
    const timestamp = new Date().toISOString();
    const messageId = `dev-${Date.now()}`;

    console.log('\n' + '='.repeat(60));
    console.log('📧 [DEV] メール送信シミュレーション');
    console.log('='.repeat(60));
    console.log(`📅 日時: ${timestamp}`);
    console.log(`🆔 メッセージID: ${messageId}`);
    console.log(`📮 宛先: ${options.to}`);
    console.log(`📝 件名: ${options.subject}`);
    console.log(`📤 送信元: ${options.from || 'noreply@board-app.com'}`);
    
    if (options.text) {
      console.log('\n--- プレーンテキスト ---');
      console.log(options.text);
    }
    
    if (options.html) {
      console.log('\n--- HTML (最初の500文字) ---');
      // HTMLタグを簡単に除去して表示
      const textContent = options.html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .substring(0, 500);
      console.log(textContent);
    }
    
    console.log('='.repeat(60));
    console.log('✅ [DEV] メール送信完了（シミュレーション）');
    console.log('='.repeat(60) + '\n');

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
    console.log('\n' + '🔐'.repeat(30));
    console.log('📧 メール認証リンク（開発環境）');
    console.log('🔐'.repeat(30));
    console.log(`👤 ユーザー名: ${data.userName}`);
    console.log(`📮 メールアドレス: ${to}`);
    console.log(`🔗 認証URL:`);
    console.log(`   ${data.verificationUrl}`);
    if (data.verificationCode) {
      console.log(`🔢 認証コード: ${data.verificationCode}`);
    }
    console.log('⏰ 有効期限: 24時間');
    console.log('🔐'.repeat(30) + '\n');
    
    // ブラウザで開けるように見やすく表示
    console.log('👆 上記URLをブラウザで開いて認証を完了してください');
    console.log('\n');
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
    console.log('\n' + '🔑'.repeat(30));
    console.log('📧 パスワードリセットリンク（開発環境）');
    console.log('🔑'.repeat(30));
    console.log(`👤 ユーザー名: ${data.userName}`);
    console.log(`📮 メールアドレス: ${to}`);
    console.log(`🔗 リセットURL:`);
    console.log(`   ${data.resetUrl}`);
    if (data.resetCode) {
      console.log(`🔢 リセットコード: ${data.resetCode}`);
    }
    console.log(`⏰ 有効期限: ${data.expiresIn || '1時間'}`);
    console.log('🔑'.repeat(30) + '\n');
  }
}