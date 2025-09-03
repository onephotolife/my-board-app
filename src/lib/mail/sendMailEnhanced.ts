// Enhanced email sending with multiple fallback methods
import { sendEmail as sendEmailSMTP } from './sendMail';
import { sendEmailWithResend } from './sendMailWithResend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Gmail-friendly HTML template with better deliverability
export function getGmailOptimizedHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>メール</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; background-color: #f4f4f4;">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; padding: 0;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 40px 30px;">
              ${content}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export async function sendEmailEnhanced({ to, subject, html }: EmailOptions) {
  console.warn('\n🚀 Enhanced Email Sending - Starting multi-method delivery');
  console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  
  // Method 1: Try Resend first (best for Gmail delivery)
  if (process.env.RESEND_API_KEY) {
    console.warn('📧 Method 1: Attempting Resend...');
    const resendResult = await sendEmailWithResend({ to, subject, html });
    if (resendResult.success) {
      console.warn('✅ Success with Resend!');
      return resendResult;
    }
    console.warn('⚠️ Resend failed, trying next method...');
  }
  
  // Method 2: Try SMTP
  console.warn('📧 Method 2: Attempting SMTP...');
  const smtpResult = await sendEmailSMTP({ to, subject, html });
  if (smtpResult.success && !smtpResult.devMode) {
    console.warn('✅ Success with SMTP!');
    return smtpResult;
  }
  
  // Method 3: Log to file as last resort
  if (!smtpResult.success || smtpResult.devMode) {
    console.warn('📧 Method 3: Logging to file...');
    const fs = require('fs').promises;
    const path = require('path');
    
    const emailLog = {
      timestamp: new Date().toISOString(),
      to,
      subject,
      url: html.match(/href="([^"]+)"/)?.[1] || 'No URL found',
    };
    
    const logPath = path.join(process.cwd(), 'email-logs.json');
    
    try {
      let logs = [];
      try {
        const existing = await fs.readFile(logPath, 'utf-8');
        logs = JSON.parse(existing);
      } catch {
        // File doesn't exist yet
      }
      
      logs.push(emailLog);
      await fs.writeFile(logPath, JSON.stringify(logs, null, 2));
      
      console.warn('✅ Email logged to file: email-logs.json');
      console.warn('📋 Email details:', emailLog);
      
      return { 
        success: true, 
        messageId: `file-${Date.now()}`,
        method: 'file-log',
        logPath,
        details: emailLog
      };
    } catch (error) {
      console.error('❌ Failed to log email:', error);
    }
  }
  
  return smtpResult;
}