import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_SERVER_HOST,
  port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_SERVER_USER,
    pass: process.env.EMAIL_SERVER_PASSWORD,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: EmailOptions) {
  try {
    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || 'noreply@yourapp.com',
      to,
      subject,
      html,
    });
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Email send error:', error);
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
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #2563eb;">パスワードリセット</h2>
          <p>こんにちは、${name}さん</p>
          <p>パスワードリセットのリクエストを受け付けました。以下のボタンをクリックして新しいパスワードを設定してください。</p>
          <div style="margin: 30px 0;">
            <a href="${resetUrl}" 
               style="background-color: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              パスワードをリセットする
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            このリンクは1時間有効です。ボタンが機能しない場合は、以下のURLをブラウザにコピー＆ペーストしてください：
          </p>
          <p style="color: #666; font-size: 12px; word-break: break-all;">
            ${resetUrl}
          </p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
          <p style="color: #999; font-size: 12px;">
            このリクエストに心当たりがない場合は、このメールを無視してください。パスワードは変更されません。
          </p>
        </div>
      </body>
    </html>
  `;
}