#!/usr/bin/env node

/**
 * 手動認証デバッグスクリプト
 * 25人天才エンジニア会議による問題調査
 */

const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const BASE_URL = 'http://localhost:3000';

async function debugUnverifiedLogin() {
  console.log('🔍 メール未確認ログインのデバッグ開始\n');
  
  try {
    // 1. CSRFトークン取得
    console.log('1️⃣ CSRFトークン取得中...');
    const csrfResponse = await fetch(`${BASE_URL}/api/auth/csrf`);
    const csrfData = await csrfResponse.json();
    console.log('   CSRFトークン:', csrfData.csrfToken?.substring(0, 20) + '...');
    
    // 2. NextAuth signIn APIを直接呼び出し
    console.log('\n2️⃣ NextAuth signIn API 直接呼び出し...');
    const signInResponse = await fetch(`${BASE_URL}/api/auth/callback/credentials`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'X-CSRF-Token': csrfData.csrfToken, // NextAuth v5用のCSRFヘッダー
        'Cookie': csrfResponse.headers.get('set-cookie') || '', // CSRFクッキーも送信
      },
      body: new URLSearchParams({
        email: 'unverified@test.com',
        password: 'Test123!',
        csrfToken: csrfData.csrfToken || ''
      }),
      redirect: 'manual'
    });
    
    console.log('   ステータス:', signInResponse.status);
    console.log('   ヘッダー:', Object.fromEntries(signInResponse.headers));
    
    const location = signInResponse.headers.get('location');
    if (location) {
      console.log('   リダイレクト先:', location);
      
      // URLパラメータを解析
      const url = new URL(location, BASE_URL);
      console.log('   エラーパラメータ:', url.searchParams.get('error'));
    }
    
    // 3. レスポンス本文確認
    const responseText = await signInResponse.text();
    if (responseText) {
      console.log('   レスポンス本文:', responseText.substring(0, 200) + '...');
    }
    
    // 4. セッション状態確認
    console.log('\n3️⃣ セッション状態確認...');
    const sessionResponse = await fetch(`${BASE_URL}/api/auth/session`);
    const sessionData = await sessionResponse.json();
    console.log('   セッションデータ:', sessionData);
    
  } catch (error) {
    console.error('❌ エラー:', error.message);
  }
}

debugUnverifiedLogin();