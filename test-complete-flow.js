// Complete browser simulation test for password reset and login flow
const puppeteer = require('puppeteer');

const BASE_URL = 'http://localhost:3000';
const TEST_EMAIL = 'one.photolife+3@gmail.com';
const NEW_PASSWORD = 'NewSecure123\!@#';

async function testPasswordResetAndLoginFlow() {
  console.log('🧪 Complete Browser Test - Password Reset & Login Flow');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  let browser;
  
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: false, // Set to true for CI/CD
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Monitor console logs
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('❌ Browser Console Error:', msg.text());
      }
    });
    
    // Monitor network errors
    page.on('pageerror', error => {
      console.log('❌ Page Error:', error.message);
    });
    
    // Step 1: Request password reset
    console.log('📧 Step 1: Requesting password reset via test endpoint...');
    const resetResponse = await page.evaluate(async (email) => {
      const response = await fetch('/api/auth/request-reset-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      return response.json();
    }, TEST_EMAIL);
    
    if (\!resetResponse.success) {
      throw new Error('Failed to request password reset: ' + resetResponse.error);
    }
    
    console.log('✅ Reset URL generated:', resetResponse.resetUrl);
    
    // Step 2: Navigate to reset password page
    console.log('\n🔐 Step 2: Navigating to reset password page...');
    await page.goto(resetResponse.resetUrl, { waitUntil: 'networkidle2' });
    
    // Wait for the form to load
    await page.waitForSelector('input[type="password"]', { timeout: 10000 });
    
    // Fill in new password
    console.log('   Filling in new password...');
    await page.type('input[type="password"][id="password"]', NEW_PASSWORD);
    await page.type('input[type="password"][id="confirmPassword"]', NEW_PASSWORD);
    
    // Submit the form
    console.log('   Submitting password reset form...');
    await page.click('button[type="submit"]');
    
    // Wait for success message
    await page.waitForFunction(
      () => document.body.textContent.includes('パスワードリセット完了'),
      { timeout: 10000 }
    );
    console.log('✅ Password reset successful');
    
    // Step 3: Navigate to login page
    console.log('\n🔓 Step 3: Navigating to login page...');
    await page.click('a[href="/auth/signin"]');
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Wait for login form
    await page.waitForSelector('input[type="email"]', { timeout: 10000 });
    
    // Fill in login credentials
    console.log('   Filling in login credentials...');
    await page.type('input[type="email"]', TEST_EMAIL);
    await page.type('input[type="password"]', NEW_PASSWORD);
    
    // Submit login form
    console.log('   Submitting login form...');
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    await Promise.race([
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 }),
      page.waitForFunction(
        () => document.body.textContent.includes('メールアドレスまたはパスワードが正しくありません'),
        { timeout: 10000 }
      ).then(() => {
        throw new Error('Login failed: Invalid credentials error shown');
      })
    ]);
    
    // Check if we're on the board page (successful login)
    const currentUrl = page.url();
    if (currentUrl.includes('/board')) {
      console.log('✅ Login successful\! Redirected to board page');
    } else {
      console.log('❌ Login failed. Current URL:', currentUrl);
      const pageContent = await page.evaluate(() => document.body.innerText);
      console.log('Page content:', pageContent.substring(0, 500));
    }
    
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 Test completed\!');
    
  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error(error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if puppeteer is installed
try {
  require.resolve('puppeteer');
  testPasswordResetAndLoginFlow();
} catch (e) {
  console.log('📦 Installing puppeteer...');
  const { execSync } = require('child_process');
  execSync('npm install puppeteer', { stdio: 'inherit' });
  console.log('✅ Puppeteer installed. Please run the test again.');
}
EOF < /dev/null