// Enhanced Email service with ESTREAM error fix
// Use dynamic import for Turbopack compatibility
import type { Transporter } from 'nodemailer';
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

// Rate limiting storage
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

export class EmailService {
  private transporter: Transporter | null = null;
  private initialized = false;

  constructor() {
    // Initialize on first use
  }

  /**
   * Initialize the email transporter with enhanced Gmail settings
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Dynamic import for Turbopack compatibility
      const nodemailer = await import('nodemailer');
      const createTransport = nodemailer.createTransport || nodemailer.default?.createTransport || nodemailer.default;
      
      if (!createTransport) {
        throw new Error('Failed to load nodemailer createTransport function');
      }

      const config = getEmailConfig();
      
      console.log('🔧 Initializing email service with config:', {
        host: config.host,
        port: config.port,
        user: config.auth.user,
        from: config.from,
      });

      // Create transporter with Gmail-specific optimizations
      this.transporter = createTransport({
        service: 'gmail', // Use Gmail service directly
        host: 'smtp.gmail.com',
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: config.auth.user,
          pass: config.auth.pass,
        },
        tls: {
          rejectUnauthorized: false,
          minVersion: 'TLSv1.2',
        },
        pool: true, // Use pooled connections
        maxConnections: 5,
        maxMessages: 100,
        rateDelta: 1000,
        rateLimit: 5,
        logger: process.env.NODE_ENV === 'development',
        debug: process.env.NODE_ENV === 'development',
        connectionTimeout: 30000, // 30 seconds
        greetingTimeout: 30000,
        socketTimeout: 30000,
      });

      // Verify connection
      try {
        await this.transporter.verify();
        console.log('✅ Email service connected and verified successfully');
      } catch (verifyError: any) {
        console.error('⚠️ Email verification warning:', verifyError.message);
        // Continue anyway - verification might fail but sending could still work
      }

      this.initialized = true;
    } catch (error: any) {
      console.error('❌ Email service initialization failed:', error);
      throw new EmailError(
        EmailErrorType.INVALID_CONFIG,
        `Failed to initialize email service: ${error.message}`,
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
   * Send an email with retry logic
   */
  async sendMail(options: EmailOptions): Promise<EmailSendResult> {
    let lastError: any = null;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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

        // In development, optionally log email instead of sending
        if (process.env.NODE_ENV === 'development' && process.env.SEND_EMAILS !== 'true') {
          console.log('📧 Email Preview (Development Mode):');
          console.log('To:', options.to);
          console.log('Subject:', options.subject);
          console.log('Preview:', options.text?.substring(0, 100) || 'HTML email');
          
          return {
            success: true,
            messageId: `dev-${Date.now()}`,
            details: { preview: true },
          };
        }

        console.log(`📤 Sending email (attempt ${attempt}/${maxRetries})...`);

        // Send email with timeout
        const sendPromise = this.transporter.sendMail({
          from: options.from || getEmailConfig().from,
          to: options.to,
          subject: options.subject,
          html: options.html,
          text: options.text,
          attachments: options.attachments,
        });

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Email send timeout')), 30000);
        });

        const info = await Promise.race([sendPromise, timeoutPromise]) as any;

        console.log('✅ Email sent successfully:', info.messageId);

        return {
          success: true,
          messageId: info.messageId,
          details: info,
        };

      } catch (error: any) {
        lastError = error;
        console.error(`❌ Email send attempt ${attempt} failed:`, error.message);

        // If it's a rate limit error, don't retry
        if (error instanceof EmailError && error.type === EmailErrorType.RATE_LIMIT) {
          throw error;
        }

        // For ESTREAM errors, try to reinitialize
        if (error.code === 'ESTREAM' || error.code === 'ECONNECTION') {
          console.log('🔄 Reinitializing connection...');
          this.initialized = false;
          this.transporter = null;
          
          // Wait before retry
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * attempt));
          }
        }

        // For auth errors, don't retry
        if (error.code === 'EAUTH') {
          throw new EmailError(
            EmailErrorType.AUTHENTICATION_FAILED,
            'Gmail authentication failed. Please check your app password.',
            error
          );
        }
      }
    }

    // All retries failed
    console.error('❌ All email send attempts failed');
    
    if (lastError instanceof EmailError) {
      throw lastError;
    }

    throw new EmailError(
      EmailErrorType.SEND_FAILED,
      `Failed to send email after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
      lastError
    );
  }

  /**
   * Send verification email
   */
  async sendVerificationEmail(
    to: string,
    data: {
      userName: string;
      verificationUrl: string;
    }
  ): Promise<EmailSendResult> {
    const emailData: EmailTemplateData = {
      ...data,
      appName: emailAppConfig.appName,
      appUrl: emailAppConfig.appUrl,
      supportEmail: emailAppConfig.supportEmail,
    };

    const html = await render(VerificationEmail(emailData as any));
    const text = this.generateTextVersion('verification', emailData);

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
      expiresIn?: string;
    }
  ): Promise<EmailSendResult> {
    const emailData: EmailTemplateData = {
      ...data,
      appName: emailAppConfig.appName,
      appUrl: emailAppConfig.appUrl,
      supportEmail: emailAppConfig.supportEmail,
    };

    const html = await render(PasswordResetEmail(emailData as any));
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

    const html = await render(WelcomeEmail(emailData as any));
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

  /**
   * Close transporter connection
   */
  async close(): Promise<void> {
    if (this.transporter) {
      await this.transporter.close();
      this.transporter = null;
      this.initialized = false;
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

    // Gracefully close on process termination
    process.on('SIGINT', async () => {
      await emailService?.close();
      process.exit(0);
    });
  }
  return emailService;
}

export default getEmailService;