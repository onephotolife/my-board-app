// Real-world test for password reset and login flow
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+3@gmail.com';
const NEW_PASSWORD = 'NewSecure123!@#' + Date.now(); // Unique password each time

async function testRealWorldFlow() {
  console.log('🧪 Real-World Test - Password Reset & Login Flow');
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
    
    console.log('✅ Reset URL generated');
    const token = resetData.resetUrl.split('/').pop();
    console.log('🔑 Token:', token.substring(0, 20) + '...');
    
    // Step 2: Reset password
    console.log('\n🔐 Step 2: Resetting password...');
    console.log('   New password:', NEW_PASSWORD);
    
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
      throw new Error('Failed to reset password: ' + JSON.stringify(resetPasswordData));
    }
    
    console.log('✅ Password reset successful');
    console.log('   Message:', resetPasswordData.message);
    
    // Wait a moment for DB to update
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Step 3: Attempt to login with new password using NextAuth
    console.log('\n🔓 Step 3: Testing login with new password...');
    
    // First, get CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    console.log('   CSRF Token obtained');
    
    // Attempt login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: NEW_PASSWORD,
        csrfToken: csrfToken,
        callbackUrl: `${BASE_URL}/board`,
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    console.log('📝 Login response status:', loginResponse.status);
    console.log('📝 Login response headers:', loginResponse.headers.get('location'));
    
    const loginBody = await loginResponse.text();
    
    if (loginResponse.status === 200 || loginResponse.status === 302) {
      // Check if response indicates success
      if (loginBody.includes('error') || loginBody.includes('メールアドレスまたはパスワード')) {
        console.log('❌ Login failed: Error in response body');
        console.log('Response body:', loginBody.substring(0, 500));
      } else {
        console.log('✅ Login successful! User can now access the system.');
      }
    } else if (loginResponse.status === 401) {
      console.log('❌ Login failed: Authentication failed (401)');
      console.log('Response:', loginBody);
    } else {
      console.log('❌ Login failed with status:', loginResponse.status);
      console.log('Response:', loginBody.substring(0, 500));
    }
    
    // Additional verification: Check if we can access protected route
    console.log('\n🔍 Step 4: Verifying authentication by checking DB user...');
    
    // Query the database directly to verify the password was updated
    const mongoose = require('mongoose');
    const bcrypt = require('bcryptjs');
    
    await mongoose.connect('mongodb://localhost:27017/boardDB');
    
    const userSchema = new mongoose.Schema({
      email: String,
      password: String,
      emailVerified: Date
    });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    const user = await User.findOne({ email: TEST_EMAIL });
    if (user) {
      console.log('   User found in DB');
      console.log('   Email verified:', user.emailVerified);
      
      const passwordMatch = await bcrypt.compare(NEW_PASSWORD, user.password);
      console.log('   Password match in DB:', passwordMatch ? '✅ Yes' : '❌ No');
      
      if (!passwordMatch) {
        console.log('   ⚠️  Password in DB does not match the new password!');
      }
    } else {
      console.log('   ❌ User not found in DB');
    }
    
    await mongoose.connection.close();
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test completed!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  }
}

// Run the test
testRealWorldFlow();