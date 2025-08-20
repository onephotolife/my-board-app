require('dotenv').config({ path: '.env.local' });

// Use dynamic import for ESM module
async function loadNodemailer() {
  const { default: nodemailer } = await import('nodemailer');
  return nodemailer;
}

async function testSMTPConnection() {
  const nodemailer = await loadNodemailer();
  
  console.log('📧 SMTP Connection Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Configuration:');
  console.log('  Host:', process.env.EMAIL_SERVER_HOST);
  console.log('  Port:', process.env.EMAIL_SERVER_PORT);
  console.log('  User:', process.env.EMAIL_SERVER_USER);
  console.log('  From:', process.env.EMAIL_FROM);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const transporter = nodemailer.createTransporter({
    host: process.env.EMAIL_SERVER_HOST,
    port: parseInt(process.env.EMAIL_SERVER_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_SERVER_USER,
      pass: process.env.EMAIL_SERVER_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    },
    logger: true,
    debug: true,
  });

  try {
    console.log('🔍 Verifying SMTP connection...');
    await transporter.verify();
    console.log('✅ SMTP connection successful!\n');
    
    // Send test email
    console.log('📨 Sending test email...');
    const info = await transporter.sendMail({
      from: `Test System <${process.env.EMAIL_FROM}>`,
      to: 'one.photolif+3e@gmail.com', // Your test email
      subject: 'SMTP Test - ' + new Date().toISOString(),
      text: 'This is a test email from the password reset system.',
      html: `
        <h2>SMTP Test Email</h2>
        <p>This is a test email sent at ${new Date().toLocaleString()}</p>
        <p>If you received this, the SMTP configuration is working correctly!</p>
      `
    });
    
    console.log('✅ Test email sent successfully!');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   Accepted:', info.accepted);
    
  } catch (error) {
    console.error('❌ SMTP Error:', error);
    console.error('\nPossible issues:');
    console.error('1. Check if the SMTP credentials are correct');
    console.error('2. Ensure the SMTP server allows connections from your IP');
    console.error('3. Check if port 587 is not blocked by firewall');
    console.error('4. Verify the email account is active and can send emails');
  }
  
  process.exit(0);
}

testSMTPConnection();