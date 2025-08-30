import { test, expect } from '@playwright/test';

test.describe('Dashboard Route Conflict Investigation', () => {
  const email = 'one.photolife+1@gmail.com';
  const password = '?@thc123THC@?';
  
  test('認証してDashboardエラーを再現', async ({ page, context }) => {
    console.log('🔍 Dashboard Route競合調査開始...');
    
    // コンソールエラーを監視
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text();
        consoleErrors.push(text);
        console.log('❌ Console Error:', text);
      }
    });
    
    // ネットワークエラーを監視
    page.on('response', response => {
      if (response.status() >= 500) {
        console.log(`⚠️ ${response.status()} Error on ${response.url()}`);
      }
    });
    
    // 1. サインインページへアクセス
    console.log('1️⃣ サインインページへアクセス...');
    await page.goto('http://localhost:3000/auth/signin', {
      waitUntil: 'networkidle'
    });
    
    // 2. ログインフォームに入力
    console.log('2️⃣ ログイン情報入力...');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    
    // 3. サインインボタンをクリック
    console.log('3️⃣ サインイン実行...');
    await page.click('button[type="submit"]');
    
    // 4. リダイレクトまたはエラーを待つ
    console.log('4️⃣ 認証結果を待機...');
    await page.waitForLoadState('networkidle');
    
    // 現在のURLを確認
    const currentUrl = page.url();
    console.log('✅ 現在のURL:', currentUrl);
    
    // セッションCookieを確認
    const cookies = await context.cookies();
    const sessionCookie = cookies.find(c => c.name === 'next-auth.session-token');
    if (sessionCookie) {
      console.log('✅ セッショントークン取得成功');
      console.log('  Token (first 50 chars):', sessionCookie.value.substring(0, 50) + '...');
    } else {
      console.log('⚠️ セッショントークンが見つかりません');
    }
    
    // 5. Dashboardへ直接アクセス
    console.log('\n5️⃣ Dashboardへ直接アクセス...');
    const dashboardResponse = await page.goto('http://localhost:3000/dashboard', {
      waitUntil: 'domcontentloaded',
      timeout: 10000
    });
    
    if (dashboardResponse) {
      console.log('Dashboard Response Status:', dashboardResponse.status());
      
      if (dashboardResponse.status() === 500) {
        console.log('❌ 500エラー検出！');
        
        // ページ内容を取得
        const pageContent = await page.content();
        
        // エラーメッセージを探す
        if (pageContent.includes('parallel pages')) {
          console.log('✅ Route競合エラー確認！');
          
          // エラーメッセージを抽出
          const errorElement = await page.$('text=/You cannot have two parallel pages/');
          if (errorElement) {
            const errorText = await errorElement.textContent();
            console.log('\n🔴 エラーメッセージ:');
            console.log(errorText);
          }
          
          // 詳細情報を取得
          const preElements = await page.$$('pre');
          for (const pre of preElements) {
            const text = await pre.textContent();
            if (text && text.includes('dashboard')) {
              console.log('\n📄 エラー詳細:');
              console.log(text);
            }
          }
        }
        
        // スクリーンショットを保存
        await page.screenshot({ 
          path: 'dashboard-error-screenshot.png',
          fullPage: true 
        });
        console.log('📸 スクリーンショット保存: dashboard-error-screenshot.png');
      } else if (dashboardResponse.status() === 200) {
        console.log('✅ Dashboard正常表示');
        
        // ページタイトルを確認
        const title = await page.title();
        console.log('  Page Title:', title);
        
        // H1要素を確認
        const h1 = await page.$('h1');
        if (h1) {
          const h1Text = await h1.textContent();
          console.log('  H1 Content:', h1Text);
        }
      }
    }
    
    // 6. コンソールエラーをまとめて表示
    if (consoleErrors.length > 0) {
      console.log('\n📊 検出されたコンソールエラー:');
      consoleErrors.forEach((error, index) => {
        console.log(`  ${index + 1}. ${error}`);
      });
    }
    
    // 7. ルートパスでもエラーを確認
    console.log('\n6️⃣ ルートパスでのエラー確認...');
    await page.goto('http://localhost:3000/', {
      waitUntil: 'domcontentloaded'
    });
    
    // 少し待機してコンソールエラーを収集
    await page.waitForTimeout(2000);
    
    if (consoleErrors.length > 0) {
      console.log('\n🔍 Route競合の詳細分析:');
      const routeErrors = consoleErrors.filter(e => e.includes('parallel pages'));
      routeErrors.forEach(error => {
        // パスを抽出
        const pathMatch = error.match(/\/(.*?)\/page/g);
        if (pathMatch) {
          console.log('  競合パス:', pathMatch.join(' vs '));
        }
      });
    }
  });
});