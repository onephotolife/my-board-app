// Resend implementation for reliable email delivery
import { Resend } from 'resend';

// Initialize Resend only if API key is available
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmailWithResend({ to, subject, html }: EmailOptions) {
  try {
    console.warn('\n📧 Resend Email Request:');
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.warn(`To: ${to}`);
    console.warn(`Subject: ${subject}`);
    console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    
    if (!process.env.RESEND_API_KEY || !resend) {
      console.warn('⚠️ Resend API key not configured');
      return { success: false, error: 'Resend not configured' };
    }
    
    const data = await resend.emails.send({
      from: 'Member Board <onboarding@resend.dev>', // Use Resend's test domain for now
      to,
      subject,
      html,
    });
    
    console.warn('✅ Email sent via Resend!');
    console.warn('   Email ID:', data.data?.id);
    
    return { success: true, messageId: data.data?.id };
  } catch (error) {
    console.error('❌ Resend error:', error);
    return { success: false, error };
  }
}