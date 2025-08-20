// Email configuration
import { EmailConfig, EmailError, EmailErrorType } from '@/types/email';

// Validate environment variables
function validateEmailConfig(): void {
  // 新旧両方の環境変数名をサポート
  const hasNewVars = process.env.EMAIL_SERVER_USER && process.env.EMAIL_SERVER_PASSWORD;
  const hasOldVars = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
  
  if (!hasNewVars && !hasOldVars) {
    throw new EmailError(
      EmailErrorType.INVALID_CONFIG,
      'Missing required email configuration: EMAIL_SERVER_USER/PASSWORD or GMAIL_USER/APP_PASSWORD',
      { 
        missing: [
          'EMAIL_SERVER_USER or GMAIL_USER',
          'EMAIL_SERVER_PASSWORD or GMAIL_APP_PASSWORD'
        ] 
      }
    );
  }
}

// Email configuration
export function getEmailConfig(): EmailConfig {
  validateEmailConfig();
  
  // さくらインターネットのSMTP設定
  // 新旧両方の環境変数名をサポート
  return {
    host: process.env.EMAIL_SERVER_HOST || process.env.SMTP_HOST || 'blankinai.sakura.ne.jp',
    port: parseInt(process.env.EMAIL_SERVER_PORT || process.env.SMTP_PORT || '587', 10),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_SERVER_USER || process.env.GMAIL_USER || '', // さくらのメールアカウント
      pass: process.env.EMAIL_SERVER_PASSWORD || process.env.GMAIL_APP_PASSWORD || '', // さくらのメールパスワード
    },
    from: process.env.EMAIL_FROM || 'Board App <noreply@blankinai.com>',
    replyTo: process.env.EMAIL_REPLY_TO || process.env.EMAIL_FROM || 'support@blankinai.com',
  };
}

// App configuration for emails
export const emailAppConfig = {
  appName: process.env.NEXT_PUBLIC_APP_NAME || 'Board App',
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  supportEmail: process.env.SUPPORT_EMAIL || 'support@boardapp.com',
  socialLinks: {
    twitter: process.env.TWITTER_URL || '',
    facebook: process.env.FACEBOOK_URL || '',
    linkedin: process.env.LINKEDIN_URL || '',
  },
};

// Email rate limiting configuration
export const rateLimitConfig = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxEmailsPerWindow: 5,
  maxEmailsPerDay: 20,
};

// Email template configuration
export const templateConfig = {
  colors: {
    primary: '#667eea',
    secondary: '#764ba2',
    success: '#48bb78',
    error: '#f56565',
    warning: '#ed8936',
    text: '#1a202c',
    textLight: '#718096',
    background: '#f7fafc',
    white: '#ffffff',
    border: '#e2e8f0',
  },
  fonts: {
    sans: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  sizes: {
    containerWidth: '600px',
    buttonPadding: '12px 24px',
    borderRadius: '8px',
  },
};

// Token expiration times
export const tokenExpiration = {
  verification: 24 * 60 * 60 * 1000, // 24 hours
  passwordReset: 60 * 60 * 1000, // 1 hour
};

// Email subjects
export const emailSubjects = {
  verification: `${emailAppConfig.appName} - メールアドレスを確認してください`,
  passwordReset: `${emailAppConfig.appName} - パスワードリセットのご案内`,
  welcome: `${emailAppConfig.appName}へようこそ！`,
  passwordChanged: `${emailAppConfig.appName} - パスワードが変更されました`,
};