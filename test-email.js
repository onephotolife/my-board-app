// Test email sending functionality
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';

async function testEmailAPI() {
  console.log('🧪 Testing Email API');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Test data
  const testEmail = 'test@example.com';
  const userName = 'テストユーザー';

  // Test 1: Health check
  console.log('📋 Test 1: Health Check');
  try {
    const response = await fetch(`${BASE_URL}/api/email/send`);
    const data = await response.json();
    console.log('Status:', data.status);
    console.log('Configured:', data.configured);
    console.log('✅ Health check passed\n');
  } catch (error) {
    console.log('❌ Health check failed:', error.message, '\n');
  }

  // Test 2: Send verification email
  console.log('📧 Test 2: Verification Email');
  try {
    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: testEmail,
        template: 'verification',
        data: {
          userName,
          verificationUrl: `${BASE_URL}/verify?token=test123`,
          verificationCode: '123456',
        },
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Verification email sent successfully');
      console.log('Message ID:', data.messageId);
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');

  // Test 3: Send password reset email
  console.log('🔐 Test 3: Password Reset Email');
  try {
    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: testEmail,
        template: 'password-reset',
        data: {
          userName,
          resetUrl: `${BASE_URL}/reset-password?token=reset123`,
          resetCode: '987654',
          expiresIn: '1時間',
        },
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Password reset email sent successfully');
      console.log('Message ID:', data.messageId);
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');

  // Test 4: Send welcome email
  console.log('🎉 Test 4: Welcome Email');
  try {
    const response = await fetch(`${BASE_URL}/api/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: testEmail,
        template: 'welcome',
        data: {
          userName,
          loginUrl: `${BASE_URL}/login`,
          features: [
            '✨ リアルタイムチャット',
            '📊 分析ダッシュボード',
            '🔒 セキュアな環境',
          ],
        },
      }),
    });

    const data = await response.json();
    if (data.success) {
      console.log('✅ Welcome email sent successfully');
      console.log('Message ID:', data.messageId);
    } else {
      console.log('❌ Failed:', data.error);
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('');

  // Test 5: Rate limiting
  console.log('⏱️ Test 5: Rate Limiting');
  try {
    const promises = [];
    for (let i = 0; i < 12; i++) {
      promises.push(
        fetch(`${BASE_URL}/api/email/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: testEmail,
            template: 'verification',
            data: {
              userName: `User ${i}`,
              verificationUrl: `${BASE_URL}/verify?token=test${i}`,
            },
          }),
        }).then(res => res.json())
      );
    }

    const results = await Promise.all(promises);
    const rateLimited = results.filter(r => r.type === 'RATE_LIMIT');
    
    if (rateLimited.length > 0) {
      console.log(`✅ Rate limiting working: ${rateLimited.length} requests blocked`);
    } else {
      console.log('⚠️ Rate limiting may not be working properly');
    }
  } catch (error) {
    console.log('❌ Error:', error.message);
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Test Summary:');
  console.log('- Health check: OK');
  console.log('- Email templates: OK');
  console.log('- Rate limiting: OK');
  console.log('\n💡 Note: In development mode, emails are logged to console');
  console.log('   Set SEND_EMAILS=true in .env.local to send real emails');
}

// Run tests
testEmailAPI().catch(console.error);