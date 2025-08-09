// Test login after password reset
const fetch = require('node-fetch');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+3@gmail.com';
const CURRENT_PASSWORD = 'TestPassword123!@#'; // Known password we just set
const NEW_PASSWORD = 'UpdatedSecurePass789!@#$%'; // New password to set (more complex)

async function testLoginAfterReset() {
  console.log('🧪 Testing Login After Password Reset');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  try {
    // Step 1: Test login with current password
    console.log('📋 Step 1: Testing login with current password...');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Password:', CURRENT_PASSWORD);
    
    // Get CSRF token
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    const csrfToken = csrfData.csrfToken;
    
    // Attempt login
    const loginResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: CURRENT_PASSWORD,
        csrfToken: csrfToken,
        callbackUrl: `${BASE_URL}/board`,
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    console.log('   Login response status:', loginResponse.status);
    const loginBody = await loginResponse.text();
    
    if (loginResponse.status === 200 || loginResponse.status === 302) {
      if (loginBody.includes('error')) {
        console.log('   ❌ Login failed with current password');
        console.log('   Error:', loginBody.substring(0, 200));
      } else {
        console.log('   ✅ Login successful with current password');
      }
    } else {
      console.log('   ❌ Login failed. Status:', loginResponse.status);
    }
    
    // Step 2: Request password reset
    console.log('\n📧 Step 2: Requesting password reset...');
    const resetResponse = await fetch(`${BASE_URL}/api/auth/request-reset-test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: TEST_EMAIL })
    });
    
    const resetData = await resetResponse.json();
    
    if (!resetData.success) {
      throw new Error('Failed to request password reset: ' + resetData.error);
    }
    
    const token = resetData.resetUrl.split('/').pop();
    console.log('   ✅ Reset token generated');
    
    // Step 3: Reset password
    console.log('\n🔐 Step 3: Resetting password...');
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
    console.log('   Response:', resetPasswordData);
    
    if (!resetPasswordData.success) {
      throw new Error('Failed to reset password: ' + JSON.stringify(resetPasswordData));
    }
    
    console.log('   ✅ Password reset successful');
    
    // Wait for DB to update
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Step 4: Test login with new password
    console.log('\n🔓 Step 4: Testing login with NEW password...');
    console.log('   Email:', TEST_EMAIL);
    console.log('   Password:', NEW_PASSWORD);
    
    // Get new CSRF token
    const csrfResponse2 = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData2 = await csrfResponse2.json();
    const csrfToken2 = csrfData2.csrfToken;
    
    // Attempt login with new password
    const loginResponse2 = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        email: TEST_EMAIL,
        password: NEW_PASSWORD,
        csrfToken: csrfToken2,
        callbackUrl: `${BASE_URL}/board`,
        json: 'true'
      }),
      redirect: 'manual'
    });
    
    console.log('   Login response status:', loginResponse2.status);
    const loginBody2 = await loginResponse2.text();
    
    if (loginResponse2.status === 200 || loginResponse2.status === 302) {
      if (loginBody2.includes('error')) {
        console.log('   ❌ Login FAILED with new password!');
        console.log('   This is the issue reported by the user!');
        console.log('   Response:', loginBody2.substring(0, 300));
      } else {
        console.log('   ✅ Login SUCCESSFUL with new password!');
      }
    } else {
      console.log('   ❌ Login failed. Status:', loginResponse2.status);
    }
    
    // Step 5: Check DB directly
    console.log('\n🔍 Step 5: Checking database directly...');
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
      console.log('   Email verified:', user.emailVerified ? '✅' : '❌');
      
      const oldMatch = await bcrypt.compare(CURRENT_PASSWORD, user.password);
      const newMatch = await bcrypt.compare(NEW_PASSWORD, user.password);
      
      console.log('   Old password matches:', oldMatch ? '⚠️ YES (should be NO)' : '✅ NO');
      console.log('   New password matches:', newMatch ? '✅ YES' : '❌ NO');
      
      if (!newMatch) {
        console.log('\n   🚨 CRITICAL: Password was NOT updated in database!');
        console.log('   This is why login fails after reset!');
      }
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
testLoginAfterReset();