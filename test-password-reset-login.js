// Complete test for password reset and login flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+3@gmail.com';
const NEW_PASSWORD = 'NewSecure123!@#';

async function testPasswordResetAndLogin() {
  console.log('🧪 Starting Password Reset and Login Test');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Step 1: Request password reset
    console.log('📧 Step 1: Requesting password reset...');
    const resetResponse = await fetch(`${BASE_URL}/api/auth/request-reset-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    const resetData = await resetResponse.json();
    
    if (!resetData.success) {
      throw new Error('Failed to request password reset: ' + resetData.error);
    }
    
    console.log('✅ Reset URL generated:', resetData.resetUrl);
    
    // Extract token from URL
    const token = resetData.resetUrl.split('/').pop();
    console.log('🔑 Token:', token);
    
    // Step 2: Reset password
    console.log('\n🔐 Step 2: Resetting password...');
    const resetPasswordResponse = await fetch(`${BASE_URL}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        token,
        password: NEW_PASSWORD,
        confirmPassword: NEW_PASSWORD
      })
    });
    
    const resetPasswordData = await resetPasswordResponse.json();
    
    if (!resetPasswordData.success) {
      throw new Error('Failed to reset password: ' + resetPasswordData.error);
    }
    
    console.log('✅ Password reset successful');
    
    // Step 3: Attempt to login with new password
    console.log('\n🔓 Step 3: Testing login with new password...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: NEW_PASSWORD,
        csrfToken: 'test',
        callbackUrl: `${BASE_URL}/dashboard`,
        json: 'true'
      })
    });
    
    const loginText = await loginResponse.text();
    
    console.log('📝 Login response status:', loginResponse.status);
    console.log('📝 Login response headers:', loginResponse.headers.raw());
    
    if (loginResponse.status === 200 || loginResponse.status === 302) {
      console.log('✅ Login successful! User can now access the system.');
    } else {
      console.log('❌ Login failed with status:', loginResponse.status);
      console.log('Response:', loginText);
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testPasswordResetAndLogin();