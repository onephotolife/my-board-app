// Email service using Nodemailer
import nodemailer, { Transporter } from 'nodemailer';
import { render } from '@react-email/render';
import {
  EmailOptions,
  EmailSendResult,
  EmailError,
  EmailErrorType,
  EmailTemplateData,
} from '@/types/email';
import { getEmailConfig, emailAppConfig, rateLimitConfig } from './config';
import VerificationEmail from './templates/verification';
import PasswordResetEmail from './templates/password-reset';
import WelcomeEmail from './templates/welcome';

// Rate limiting storage (in production, use Redis or database)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

  constructor() {
    // Initialize on first use
  }

  /**
   * Initialize the email transporter
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      const config = getEmailConfig();
      
      console.log('🔧 メールサービス初期化:', {
        host: config.host,
        port: config.port,
        secure: config.secure,
        user: config.auth.user,
        from: config.from,
      });

      // Gmailへの誤接続を防ぐため、完全にハードコードされた設定を使用
      // 注意: 環境変数ではなく、直接値を指定
      const sakuraHost = 'blankinai.sakura.ne.jp';
      const sakuraPort = 587;
      const sakuraUser = config.auth.user || 'noreply@blankinai.com';
      const sakuraPass = config.auth.pass;
      
      console.log('🌸 さくらSMTP設定 (強制):', {
        host: sakuraHost,
        port: sakuraPort,
        user: sakuraUser,
        hasPassword: !!sakuraPass,
        timestamp: new Date().toISOString(),
      });

      // nodemailerの設定を完全に上書き
      const transportConfig: any = {
        host: sakuraHost, // 必ずさくらのホストを使用
        port: sakuraPort,
        secure: false, // STARTTLSを使用
        requireTLS: true, // TLSを必須に
        auth: {
          user: sakuraUser,
          pass: sakuraPass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        // 追加の設定
        name: sakuraHost,
        localAddress: undefined, // ローカルアドレスを指定しない
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 15000,
      };

      // デバッグログを有効化
      if (process.env.NODE_ENV === 'production') {
        transportConfig.logger = true;
        transportConfig.debug = true;
      }

      console.log('🚀 nodemailer.createTransport()実行中...');
      this.transporter = nodemailer.createTransport(transportConfig);

      // Verify connection - 一時的にverifyをスキップして問題を特定
      console.log('⚠️  SMTP verifyをスキップ中 (デバッグ目的)');
      // if (process.env.NODE_ENV === 'production' || process.env.SEND_EMAILS === 'true') {
      //   console.log('🔍 SMTPサーバーへの接続を検証中...');
      //   await this.transporter.verify();
      //   console.log('✅ Email service connected successfully');
      // }

      this.initialized = true;
    } catch (error) {
      console.error('❌ Email service initialization failed:', {
        error: error instanceof Error ? error.message : error,
        code: (error as any)?.code,
        errno: (error as any)?.errno,
        syscall: (error as any)?.syscall,
        hostname: (error as any)?.hostname,
        stack: error instanceof Error ? error.stack : undefined,
      });
      
      // エラーメッセージをより具体的に
      const errorMessage = error instanceof Error ? error.message : String(error);
      let specificMessage = 'メールサービスの初期化に失敗しました';
      
      if (errorMessage.includes('Invalid login') || errorMessage.includes('AUTH')) {
        specificMessage = 'SMTP認証に失敗しました。ユーザー名とパスワードを確認してください。';
      } else if (errorMessage.includes('ECONNREFUSED')) {
        specificMessage = 'メールサーバーに接続できません。ホスト名とポート番号を確認してください。';
      } else if (errorMessage.includes('ETIMEDOUT')) {
        specificMessage = 'メールサーバーへの接続がタイムアウトしました。ネットワーク設定を確認してください。';
      }
      
      throw new EmailError(
        EmailErrorType.INVALID_CONFIG,
        specificMessage,
        error
      );
    }
  }

  /**
   * Check rate limit for an email address
   */
  private checkRateLimit(email: string): boolean {
    const now = Date.now();
    const limit = rateLimitMap.get(email);

    if (!limit) {
      rateLimitMap.set(email, {
        count: 1,
        resetTime: now + rateLimitConfig.windowMs,
      });
      return true;
    }

    if (now > limit.resetTime) {
      // Reset window
      rateLimitMap.set(email, {
        count: 1,
        resetTime: now + rateLimitConfig.windowMs,
      });
      return true;
    }

    if (limit.count >= rateLimitConfig.maxEmailsPerWindow) {
      return false;
    }

    limit.count++;
    return true;
  }

  /**
   * Send an email
   */
  async sendMail(options: EmailOptions): Promise<EmailSendResult> {
    try {
      // 受信者チェック
      if (!options.to) {
        throw new EmailError(
          EmailErrorType.INVALID_CONFIG,
          'No recipient email address provided'
        );
      }

      console.log('📧 メール送信開始:', {
        to: options.to,
        subject: options.subject,
        environment: process.env.NODE_ENV,
        sendEmails: process.env.SEND_EMAILS,
      });

      await this.initialize();

      if (!this.transporter) {
        throw new EmailError(
          EmailErrorType.INVALID_CONFIG,
          'Email transporter not initialized'
        );
      }

      // Check rate limit
      const recipient = Array.isArray(options.to) ? options.to[0] : options.to;
      if (!this.checkRateLimit(recipient)) {
        throw new EmailError(
          EmailErrorType.RATE_LIMIT,
          'Rate limit exceeded. Please try again later.'
        );
      }

      // In development, use DevEmailService for better logging
      if (process.env.NODE_ENV === 'development' && process.env.SEND_EMAILS !== 'true') {
        const { DevEmailService } = await import('./dev-mailer');
        return DevEmailService.logEmail(options);
      }

      // Send email
      const config = getEmailConfig();
      const mailOptions = {
        from: options.from || config.from,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      console.log('📮 メール送信オプション:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        host: config.host,
        port: config.port,
        user: config.auth.user,
      });

      const info = await this.transporter.sendMail(mailOptions);

      console.log('✅ メール送信成功:', {
        messageId: info.messageId,
        response: info.response,
      });

      return {
        success: true,
        messageId: info.messageId,
        details: info,
      };
    } catch (error) {
      console.error('❌ メール送信エラー:', {
        error: error instanceof Error ? error.message : error,
        stack: error instanceof Error ? error.stack : undefined,
        code: (error as any)?.code,
        response: (error as any)?.response,
        responseCode: (error as any)?.responseCode,
      });
      
      if (error instanceof EmailError) {
        throw error;
      }

      // さくらインターネット特有のエラーをチェック
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage.includes('AUTH') || errorMessage.includes('authentication')) {
        throw new EmailError(
          EmailErrorType.INVALID_CONFIG,
          'SMTP認証に失敗しました。メールサーバーの認証情報を確認してください。',
          error
        );
      }

      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ETIMEDOUT')) {
        throw new EmailError(
          EmailErrorType.SEND_FAILED,
          'メールサーバーに接続できません。ホストとポートの設定を確認してください。',
          error
        );
      }

      throw new EmailError(
        EmailErrorType.SEND_FAILED,
        `メール送信に失敗しました: ${errorMessage}`,
        error
      );
    }
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    to: string,
    data: {
      userName: string;
      verificationUrl: string;
      verificationCode?: string;
    }
  ): Promise<EmailSendResult> {
    // toパラメータの検証
    if (!to || typeof to !== 'string') {
      throw new EmailError(
        EmailErrorType.INVALID_CONFIG,
        'Valid email address is required'
      );
    }

    const emailData: EmailTemplateData = {
      ...data,
      appName: emailAppConfig.appName,
      appUrl: emailAppConfig.appUrl,
      supportEmail: emailAppConfig.supportEmail,
    };

    const html = render(VerificationEmail(emailData as any));
    const text = this.generateTextVersion('verification', emailData);

    // 開発環境での詳細ログ（非同期処理を適切に処理）
    if (process.env.NODE_ENV === 'development') {
      import('./dev-mailer').then(({ DevEmailService }) => {
        DevEmailService.logVerificationEmail(to, data);
      }).catch(console.error);
    }

    return this.sendMail({
      to,
      subject: `${emailAppConfig.appName} - メールアドレスを確認してください`,
      html,
      text,
    });
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(
    to: string,
    data: {
      userName: string;
      resetUrl: string;
      resetCode?: string;
      expiresIn?: string;
    }
  ): Promise<EmailSendResult> {
    const emailData: EmailTemplateData = {
      ...data,
      appName: emailAppConfig.appName,
      appUrl: emailAppConfig.appUrl,
      supportEmail: emailAppConfig.supportEmail,
    };

    const html = render(PasswordResetEmail(emailData as any));
    const text = this.generateTextVersion('password-reset', emailData);

    return this.sendMail({
      to,
      subject: `${emailAppConfig.appName} - パスワードリセットのご案内`,
      html,
      text,
    });
  }

  /**
   * Send welcome email
   */
  async sendWelcomeEmail(
    to: string,
    data: {
      userName: string;
      loginUrl: string;
      features?: string[];
    }
  ): Promise<EmailSendResult> {
    const emailData: EmailTemplateData = {
      ...data,
      appName: emailAppConfig.appName,
      appUrl: emailAppConfig.appUrl,
      supportEmail: emailAppConfig.supportEmail,
    };

    const html = render(WelcomeEmail(emailData as any));
    const text = this.generateTextVersion('welcome', emailData);

    return this.sendMail({
      to,
      subject: `${emailAppConfig.appName}へようこそ！`,
      html,
      text,
    });
  }

  /**
   * Generate plain text version of email
   */
  private generateTextVersion(
    template: 'verification' | 'password-reset' | 'welcome',
    data: EmailTemplateData
  ): string {
    const { userName, appName } = data;

    switch (template) {
      case 'verification':
        return `
こんにちは、${userName}様

${appName}へのご登録ありがとうございます。

メールアドレスを確認するには、以下のリンクをクリックしてください：
${data.verificationUrl}

${data.verificationCode ? `確認コード: ${data.verificationCode}` : ''}

このリンクは24時間有効です。

このメールに心当たりがない場合は、無視してください。

${appName}サポートチーム
        `.trim();

      case 'password-reset':
        return `
パスワードリセットのご案内

こんにちは、${userName}様

${appName}アカウントのパスワードリセットリクエストを受け付けました。

新しいパスワードを設定するには、以下のリンクをクリックしてください：
${data.resetUrl}

${data.resetCode ? `リセットコード: ${data.resetCode}` : ''}

このリンクは${data.expiresIn || '1時間'}のみ有効です。

このリクエストに心当たりがない場合は、このメールを無視してください。

${appName}サポートチーム
        `.trim();

      case 'welcome':
        return `
${appName}へようこそ！

こんにちは、${userName}様

${appName}への登録が完了しました！

今すぐ始める：
${data.loginUrl}

ご不明な点がございましたら、お気軽にサポートチームまでお問い合わせください。
${data.supportEmail}

素晴らしい体験をお届けできることを楽しみにしています！

${appName}チーム
        `.trim();

      default:
        return '';
    }
  }

  /**
   * Clean up old rate limit entries
   */
  cleanupRateLimits(): void {
    const now = Date.now();
    for (const [email, limit] of rateLimitMap.entries()) {
      if (now > limit.resetTime) {
        rateLimitMap.delete(email);
      }
    }
  }
}

// Singleton instance
let emailService: EmailService | null = null;

export function getEmailService(): EmailService {
  if (!emailService) {
    emailService = new EmailService();
    
    // Clean up rate limits every hour
    setInterval(() => {
      emailService?.cleanupRateLimits();
    }, 60 * 60 * 1000);
  }
  return emailService;
}

export default getEmailService;