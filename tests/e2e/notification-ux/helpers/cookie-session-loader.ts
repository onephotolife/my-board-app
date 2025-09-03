import { Page, BrowserContext } from '@playwright/test';
import fs from 'fs/promises';
import path from 'path';

/**
 * Cookieファイルからセッショントークンを読み込んでブラウザコンテキストに注入
 * 
 * 利点:
 * - 事前に生成したセッショントークンを使用可能
 * - 認証フローをバイパスして高速化
 * - 複数のテストで同じセッションを再利用可能
 */

export interface SessionCookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface CookieSessionConfig {
  cookieFilePath?: string;
  testMode?: boolean;
  mockUserId?: string;
  mockEmail?: string;
}

/**
 * デフォルトのセッションクッキー設定
 */
const DEFAULT_COOKIE_CONFIG: Partial<SessionCookie> = {
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax'
};

/**
 * Cookieファイルからセッショントークンを読み込む
 */
export async function loadSessionFromCookieFile(
  filePath: string
): Promise<SessionCookie[]> {
  try {
    console.log('📂 [Cookie Loader] Cookieファイル読み込み開始:', filePath);
    
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const cookies = JSON.parse(fileContent);
    
    // 配列でない場合は配列に変換
    const cookieArray = Array.isArray(cookies) ? cookies : [cookies];
    
    console.log('✅ [Cookie Loader] Cookieファイル読み込み成功:', {
      cookieCount: cookieArray.length,
      cookies: cookieArray.map(c => ({ name: c.name, domain: c.domain }))
    });
    
    return cookieArray;
  } catch (error) {
    console.error('❌ [Cookie Loader] Cookieファイル読み込みエラー:', error);
    throw new Error(`Failed to load cookie file: ${filePath}`);
  }
}

/**
 * モックセッションクッキーを生成（テスト用）
 */
export function createMockSessionCookie(config: CookieSessionConfig): SessionCookie {
  const userId = config.mockUserId || '68b00bb9e2d2d61e174b2204';
  const email = config.mockEmail || 'test@example.com';
  
  // NextAuth.js形式のモックトークンを生成
  const mockToken = {
    user: {
      id: userId,
      email: email,
      name: 'Test User',
      emailVerified: true,
      role: 'user',
      createdAt: new Date('2023-06-01').toISOString()
    },
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60), // 30日後
    jti: `test-jwt-${Date.now()}`
  };
  
  // Base64エンコード（簡易版）
  const tokenValue = Buffer.from(JSON.stringify(mockToken)).toString('base64');
  
  console.log('🔧 [Cookie Loader] モックセッションクッキー生成:', {
    userId,
    email,
    tokenLength: tokenValue.length
  });
  
  return {
    name: 'next-auth.session-token',
    value: tokenValue,
    ...DEFAULT_COOKIE_CONFIG
  };
}

/**
 * ブラウザコンテキストにセッションクッキーを注入
 */
export async function injectSessionCookies(
  context: BrowserContext,
  cookies: SessionCookie[]
): Promise<void> {
  try {
    console.log('💉 [Cookie Loader] セッションクッキー注入開始:', {
      cookieCount: cookies.length
    });
    
    await context.addCookies(cookies);
    
    console.log('✅ [Cookie Loader] セッションクッキー注入成功');
  } catch (error) {
    console.error('❌ [Cookie Loader] セッションクッキー注入エラー:', error);
    throw new Error('Failed to inject session cookies');
  }
}

/**
 * ページにセッションクッキーを注入（ページ単位）
 */
export async function injectSessionToPage(
  page: Page,
  cookies: SessionCookie[]
): Promise<void> {
  try {
    console.log('💉 [Cookie Loader] ページへのセッションクッキー注入開始');
    
    const context = page.context();
    await injectSessionCookies(context, cookies);
    
    // ページが読み込まれていない場合はホームページに移動
    if (page.url() === 'about:blank') {
      console.log('📍 [Cookie Loader] ページをホームに移動');
      await page.goto('/', { waitUntil: 'domcontentloaded' });
    } else {
      // ページをリロードして新しいクッキーを反映
      await page.reload();
    }
    
    console.log('✅ [Cookie Loader] ページへのセッションクッキー注入成功');
  } catch (error) {
    console.error('❌ [Cookie Loader] ページへのセッションクッキー注入エラー:', error);
    throw new Error('Failed to inject session to page');
  }
}

/**
 * セッションの有効性を検証
 */
export async function validateSession(page: Page, testMode: boolean = false): Promise<boolean> {
  try {
    console.log('🔍 [Cookie Loader] セッション検証開始', { testMode });
    
    // /api/auth/sessionエンドポイントでセッション確認
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/auth/session', {
        credentials: 'include'
      });
      return res.json();
    });
    
    const isValid = !!(response?.user?.id);
    
    console.log('📊 [Cookie Loader] セッション検証結果:', {
      isValid,
      userId: response?.user?.id,
      email: response?.user?.email,
      emailVerified: response?.user?.emailVerified
    });
    
    return isValid;
  } catch (error) {
    console.error('❌ [Cookie Loader] セッション検証エラー:', error);
    return false;
  }
}

/**
 * 統合ヘルパー: Cookieファイルまたはモックセッションを使用してセッションを確立
 */
export async function setupSessionWithCookie(
  page: Page,
  config: CookieSessionConfig = {}
): Promise<boolean> {
  try {
    console.log('🚀 [Cookie Loader] セッションセットアップ開始:', {
      testMode: config.testMode,
      hasCookieFile: !!config.cookieFilePath
    });
    
    let cookies: SessionCookie[];
    
    if (config.cookieFilePath) {
      // Cookieファイルから読み込み
      cookies = await loadSessionFromCookieFile(config.cookieFilePath);
    } else {
      throw new Error('cookieFilePath must be specified');
    }
    
    // セッションクッキーを注入
    await injectSessionToPage(page, cookies);
    
    // セッションの有効性を検証
    const isValid = await validateSession(page, config.testMode || false);
    
    if (isValid) {
      console.log('✅ [Cookie Loader] セッションセットアップ成功');
    } else {
      console.error('❌ [Cookie Loader] セッションセットアップ失敗: セッションが無効');
    }
    
    return isValid;
  } catch (error) {
    console.error('❌ [Cookie Loader] セッションセットアップエラー:', error);
    return false;
  }
}

/**
 * セッションクッキーをファイルに保存（デバッグ用）
 */
export async function saveSessionToFile(
  context: BrowserContext,
  filePath: string
): Promise<void> {
  try {
    console.log('💾 [Cookie Loader] セッションクッキー保存開始:', filePath);
    
    const cookies = await context.cookies();
    const sessionCookies = cookies.filter(c => 
      c.name.includes('next-auth') || 
      c.name.includes('session')
    );
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(
      filePath,
      JSON.stringify(sessionCookies, null, 2),
      'utf-8'
    );
    
    console.log('✅ [Cookie Loader] セッションクッキー保存成功:', {
      cookieCount: sessionCookies.length,
      filePath
    });
  } catch (error) {
    console.error('❌ [Cookie Loader] セッションクッキー保存エラー:', error);
    throw new Error('Failed to save session to file');
  }
}