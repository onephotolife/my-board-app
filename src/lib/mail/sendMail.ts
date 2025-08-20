// Email sending configuration
const isEmailEnabled = process.env.EMAIL_ENABLED === 'true' || process.env.NODE_ENV === 'production';
const isDevelopment = process.env.NODE_ENV !== 'production';

console.log('📧 Email Configuration:');
console.log('  - Environment:', process.env.NODE_ENV || 'development');
console.log('  - Email Enabled:', isEmailEnabled);
console.log('  - SMTP Host:', process.env.EMAIL_SERVER_HOST || 'Not configured');
console.log('  - SMTP User:', process.env.EMAIL_SERVER_USER || 'Not configured');

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    // Always log email details for debugging
    console.log('\n📧 Email Request:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`To: ${to}`);
    console.log(`Subject: ${subject}`);
    console.log(`From: ${process.env.EMAIL_FROM || 'noreply@yourapp.com'}`);
    
    // Extract URL from HTML for easy access
    const urlMatch = html.match(/href="([^"]+)"/);
    if (urlMatch && urlMatch[1]) {
      console.log(`🔗 Reset URL: ${urlMatch[1]}`);
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!isEmailEnabled || !process.env.EMAIL_SERVER_HOST) {
      console.log('⚠️ Email sending is disabled (EMAIL_ENABLED=false or missing SMTP config)');
      console.log('To enable email sending, set EMAIL_ENABLED=true in .env.local');
      return { success: true, messageId: 'dev-' + Date.now(), devMode: true };
    }
    
    console.log('🚀 Attempting to send real email via SMTP...');
    
    // Import nodemailer dynamically
    let nodemailer;
    try {
      nodemailer = await import('nodemailer');
    } catch (importError) {
      console.error('❌ Failed to import nodemailer:', importError);
      // Fallback to require
      try {
        nodemailer = require('nodemailer');
      } catch (requireError) {
        console.error('❌ Failed to require nodemailer:', requireError);
        return { success: false, error: requireError };
      }
    }
    
    // Create transporter
    const createTransport = nodemailer.createTransport || nodemailer.default?.createTransport;
    if (!createTransport) {
      console.error('❌ createTransport function not found in nodemailer');
      console.error('Available properties:', Object.keys(nodemailer));
      return { success: false, error: new Error('createTransport not found') };
    }
    
    const transporter = createTransport({
      host: process.env.EMAIL_SERVER_HOST,
      port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
      secure: false, // Use STARTTLS
      auth: {
        user: process.env.EMAIL_SERVER_USER,
        pass: process.env.EMAIL_SERVER_PASSWORD,
      },
      tls: {
        // Do not fail on invalid certs
        rejectUnauthorized: false
      },
      logger: isDevelopment, // Enable logging in development
      debug: isDevelopment, // Enable debug output in development
    });
    
    // Verify transporter configuration before sending
    try {
      await transporter.verify();
      console.log('✅ SMTP connection verified successfully');
    } catch (verifyError: any) {
      console.error('❌ SMTP verification failed:', verifyError);
      console.error('   Error details:', verifyError.message || verifyError);
      console.error('   SMTP Config:');
      console.error('     Host:', process.env.EMAIL_SERVER_HOST);
      console.error('     Port:', process.env.EMAIL_SERVER_PORT);
      console.error('     User:', process.env.EMAIL_SERVER_USER);
      console.error('Please check your email configuration in .env.local');
      return { success: false, error: verifyError, verificationFailed: true };
    }
    
    const mailOptions = {
      from: `会員制掲示板 <${process.env.EMAIL_FROM || 'noreply@yourapp.com'}>`,
      to,
      subject,
      html,
      text: html.replace(/<[^>]*>/g, ''), // Plain text fallback
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    console.log('   Rejected:', info.rejected);
    
    return { success: true, messageId: info.messageId, info };
  } catch (error) {
    console.error('❌ Email send error:', error);
    if (error instanceof Error) {
      console.error('   Error message:', error.message);
      console.error('   Error stack:', error.stack);
    }
    return { success: false, error };
  }
}

export function getVerificationEmailHtml(name: string, verificationUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>メールアドレスの確認</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">メールアドレスの確認</h2>
          <p>こんにちは、${name}さん</p>
          <p>会員登録ありがとうございます。以下のボタンをクリックしてメールアドレスを確認してください。</p>
          <div style="margin: 30px 0;">
            <a href="${verificationUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              メールアドレスを確認する
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            このリンクは24時間有効です。ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
          </p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">
            ${verificationUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            このメールに心当たりがない場合は、無視してください。
          </p>
        </div>
      </body>
    </html>
  `;
}

export function getPasswordResetEmailHtml(name: string, resetUrl: string) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>パスワードリセット</title>
        <style>
          .email-container {
            font-family: 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 40px 20px;
          }
          .email-content {
            max-width: 600px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            padding: 40px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
          }
          .header {
            text-align: center;
            margin-bottom: 40px;
          }
          .logo {
            font-size: 48px;
            margin-bottom: 16px;
          }
          h2 {
            color: #667eea;
            font-size: 28px;
            margin: 0;
          }
          .button-container {
            text-align: center;
            margin: 40px 0;
          }
          .reset-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 16px 40px;
            text-decoration: none;
            border-radius: 12px;
            display: inline-block;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25);
          }
          .security-info {
            background: #f8fafc;
            border-left: 4px solid #667eea;
            padding: 16px;
            margin: 24px 0;
            border-radius: 8px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 24px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
            text-align: center;
          }
          .url-fallback {
            background: #f3f4f6;
            padding: 12px;
            border-radius: 8px;
            word-break: break-all;
            font-family: monospace;
            font-size: 12px;
            color: #4b5563;
            margin-top: 16px;
          }
        </style>
      </head>
      <body style="margin: 0; padding: 0;">
        <div class="email-container">
          <div class="email-content">
            <div class="header">
              <div class="logo">🔐</div>
              <h2>パスワードリセット</h2>
            </div>
            
            <p>こんにちは、${name || 'ユーザー'}様</p>
            
            <p>パスワードリセットのリクエストを受け付けました。下記のボタンをクリックして、新しいパスワードを設定してください。</p>
            
            <div class="security-info">
              <strong>🛡️ セキュリティ情報</strong>
              <ul style="margin: 8px 0 0 0; padding-left: 20px;">
                <li>このリンクは<strong>1時間</strong>で無効になります</li>
                <li>リセット後は古いパスワードは使用できません</li>
                <li>心当たりがない場合は、このメールを無視してください</li>
              </ul>
            </div>
            
            <div class="button-container">
              <a href="${resetUrl}" class="reset-button">
                パスワードをリセットする
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              ボタンが動作しない場合は、以下のURLをブラウザに直接コピー＆ペーストしてください：
            </p>
            
            <div class="url-fallback">
              ${resetUrl}
            </div>
            
            <div class="footer">
              <p style="margin: 0 0 8px 0;">
                <strong>重要:</strong> このリクエストに心当たりがない場合は、何も行う必要はありません。
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af;">
                © 2025 会員制掲示板 - すべての権利を保有
              </p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}