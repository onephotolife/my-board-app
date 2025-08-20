// Manual verification script for signup button implementation
const puppeteer = require('puppeteer');
const fs = require('fs');

async function verifySignupButton() {
  console.log('🚀 Starting signup button verification...');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({ 
      headless: false,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    
    console.log('📄 Navigating to homepage...');
    await page.goto('http://localhost:3000', { 
      waitUntil: 'networkidle2',
      timeout: 30000 
    });
    
    // Wait for session to load
    console.log('⏳ Waiting for session to load...');
    await page.waitForFunction(() => {
      const spinner = document.querySelector('[role="progressbar"]');
      const authButtons = document.querySelector('a[href="/auth/signin"], a[href="/auth/signup"]');
      return !spinner || authButtons;
    }, { timeout: 30000 });
    
    // Take initial screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/manual-verification-homepage.png',
      fullPage: true 
    });
    
    const results = {
      signupButtonExists: false,
      loginButtonExists: false,
      correctPosition: false,
      clickable: false,
      properStyling: false,
      responsiveDesign: false,
      hoverEffect: false
    };
    
    // Test 1: Check if buttons exist
    console.log('✅ Test 1: Checking button existence...');
    const signupButtons = await page.$$('a[href="/auth/signup"]');
    const loginButtons = await page.$$('a[href="/auth/signin"]');
    
    results.signupButtonExists = signupButtons.length > 0;
    results.loginButtonExists = loginButtons.length > 0;
    
    if (results.signupButtonExists && results.loginButtonExists) {
      console.log('  ✅ Both buttons found!');
      
      const signupButton = signupButtons[0];
      const loginButton = loginButtons[0];
      
      // Test 2: Check position
      console.log('✅ Test 2: Checking button position...');
      const loginBox = await loginButton.boundingBox();
      const signupBox = await signupButton.boundingBox();
      
      if (loginBox && signupBox) {
        results.correctPosition = loginBox.x < signupBox.x && Math.abs(loginBox.y - signupBox.y) < 5;
        console.log(`  📍 Login button: x=${loginBox.x}, y=${loginBox.y}`);
        console.log(`  📍 Signup button: x=${signupBox.x}, y=${signupBox.y}`);
        console.log(`  ${results.correctPosition ? '✅' : '❌'} Position test: ${results.correctPosition ? 'PASS' : 'FAIL'}`);
      }
      
      // Test 3: Check clickability
      console.log('✅ Test 3: Testing click functionality...');
      try {
        await signupButton.click();
        await page.waitForURL(/.*\/auth\/signup/, { timeout: 5000 });
        results.clickable = true;
        console.log('  ✅ Click test: PASS - Successfully navigated to signup page');
        
        // Go back to homepage
        await page.goBack();
        await page.waitForLoadState('networkidle');
      } catch (error) {
        console.log('  ❌ Click test: FAIL -', error.message);
      }
      
      // Test 4: Check styling
      console.log('✅ Test 4: Checking button styling...');
      const styles = await signupButton.evaluate(el => {
        const computed = window.getComputedStyle(el);
        return {
          display: computed.display,
          backgroundColor: computed.backgroundColor,
          color: computed.color,
          padding: computed.padding,
          borderRadius: computed.borderRadius,
          cursor: computed.cursor
        };
      });
      
      results.properStyling = styles.display !== 'none' && 
                            styles.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
                            styles.cursor === 'pointer';
      
      console.log('  📊 Button styles:', styles);
      console.log(`  ${results.properStyling ? '✅' : '❌'} Styling test: ${results.properStyling ? 'PASS' : 'FAIL'}`);
      
      // Test 5: Check responsive design
      console.log('✅ Test 5: Testing responsive design...');
      const viewports = [
        { width: 1920, height: 1080, name: 'Desktop' },
        { width: 768, height: 1024, name: 'Tablet' },
        { width: 375, height: 667, name: 'Mobile' }
      ];
      
      let responsiveResults = [];
      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await page.waitForTimeout(500);
        
        const isVisible = await signupButton.isIntersectingViewport();
        responsiveResults.push({ ...viewport, visible: isVisible });
        
        await page.screenshot({ 
          path: `tests/screenshots/manual-verification-${viewport.width}x${viewport.height}.png`
        });
      }
      
      results.responsiveDesign = responsiveResults.every(r => r.visible);
      console.log('  📱 Responsive results:', responsiveResults);
      console.log(`  ${results.responsiveDesign ? '✅' : '❌'} Responsive test: ${results.responsiveDesign ? 'PASS' : 'FAIL'}`);
      
      // Reset to desktop view for hover test
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Test 6: Check hover effect
      console.log('✅ Test 6: Testing hover effect...');
      try {
        const beforeHover = await signupButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            transform: computed.transform
          };
        });
        
        await signupButton.hover();
        await page.waitForTimeout(300);
        
        const afterHover = await signupButton.evaluate(el => {
          const computed = window.getComputedStyle(el);
          return {
            backgroundColor: computed.backgroundColor,
            transform: computed.transform
          };
        });
        
        results.hoverEffect = beforeHover.backgroundColor !== afterHover.backgroundColor ||
                             beforeHover.transform !== afterHover.transform;
        
        console.log('  🎨 Before hover:', beforeHover);
        console.log('  🎨 After hover:', afterHover);
        console.log(`  ${results.hoverEffect ? '✅' : '❌'} Hover test: ${results.hoverEffect ? 'PASS' : 'FAIL'}`);
      } catch (error) {
        console.log('  ❌ Hover test: FAIL -', error.message);
      }
      
    } else {
      console.log('  ❌ Button existence test: FAIL');
      console.log(`    - Signup buttons found: ${signupButtons.length}`);
      console.log(`    - Login buttons found: ${loginButtons.length}`);
    }
    
    // Generate report
    console.log('\n📊 Final Test Results:');
    console.log('========================');
    Object.entries(results).forEach(([test, result]) => {
      console.log(`${result ? '✅' : '❌'} ${test}: ${result ? 'PASS' : 'FAIL'}`);
    });
    
    const successRate = Object.values(results).filter(Boolean).length / Object.keys(results).length * 100;
    console.log(`\n🎯 Overall Success Rate: ${successRate.toFixed(1)}%`);
    
    // Save results to file
    const report = {
      timestamp: new Date().toISOString(),
      successRate: successRate,
      results: results,
      summary: {
        totalTests: Object.keys(results).length,
        passed: Object.values(results).filter(Boolean).length,
        failed: Object.values(results).filter(r => !r).length
      }
    };
    
    fs.writeFileSync('tests/manual-verification-report.json', JSON.stringify(report, null, 2));
    console.log('💾 Report saved to: tests/manual-verification-report.json');
    
    if (successRate === 100) {
      console.log('🎉 ALL TESTS PASSED! Signup button implementation is 100% successful!');
    } else {
      console.log(`⚠️  ${report.summary.failed} test(s) failed. Please review the issues above.`);
    }
    
  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run verification
verifySignupButton().catch(console.error);