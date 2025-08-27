/**
 * CSRFトークンマネージャー
 * Purpose: SOL-001 - CSRFトークン初期化保証メカニズム
 * STRICT120準拠
 */

export class CSRFTokenManager {
  private static instance: CSRFTokenManager | null = null;
  private token: string | null = null;
  private initPromise: Promise<string> | null = null;
  private retryCount = 0;
  private maxRetries = 3;
  private tokenExpiry: number | null = null;
  private tokenTTL = 3600000; // 1時間（ミリ秒）
  
  // シングルトンパターン
  static getInstance(): CSRFTokenManager {
    if (!CSRFTokenManager.instance) {
      CSRFTokenManager.instance = new CSRFTokenManager();
    }
    return CSRFTokenManager.instance;
  }
  
  /**
   * トークンの有効期限をチェック
   */
  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() > this.tokenExpiry;
  }
  
  /**
   * トークンを確実に取得（初期化保証）
   * @returns Promise<string> 有効なCSRFトークン
   */
  async ensureToken(): Promise<string> {
    // 既存の有効なトークンがあれば即座に返す
    if (this.token && !this.isTokenExpired()) {
      console.log('✅ [CSRF] 既存の有効なトークンを使用');
      return this.token;
    }
    
    // 初期化中なら待機
    if (this.initPromise) {
      console.log('⏳ [CSRF] トークン初期化待機中...');
      return this.initPromise;
    }
    
    // 新規初期化開始
    console.log('🔄 [CSRF] トークン初期化開始');
    this.initPromise = this.initializeToken();
    
    try {
      const token = await this.initPromise;
      return token;
    } finally {
      this.initPromise = null;
    }
  }
  
  /**
   * トークンの初期化（リトライ機能付き）
   */
  private async initializeToken(): Promise<string> {
    try {
      const response = await fetch('/api/csrf', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        throw new Error(`CSRF token fetch failed: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('CSRF token not found in response');
      }
      
      // トークンとメタデータを保存
      this.token = data.token;
      this.tokenExpiry = Date.now() + this.tokenTTL;
      this.retryCount = 0;
      
      // メタタグにも設定（DOM操作）
      if (typeof document !== 'undefined') {
        this.updateMetaTag(data.token);
      }
      
      console.log('✅ [CSRF] トークン初期化成功', {
        tokenPreview: data.token.substring(0, 20) + '...',
        expiryTime: new Date(this.tokenExpiry).toISOString()
      });
      
      return this.token;
      
    } catch (error) {
      console.error('❌ [CSRF] トークン取得エラー:', error);
      
      // リトライロジック（指数バックオフ）
      if (this.retryCount < this.maxRetries) {
        this.retryCount++;
        const delay = Math.pow(2, this.retryCount) * 1000; // 2秒、4秒、8秒
        
        console.log(`🔄 [CSRF] リトライ ${this.retryCount}/${this.maxRetries}（${delay}ms後）`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.initializeToken(); // 再帰的にリトライ
      }
      
      // リトライ上限到達
      console.error('❌ [CSRF] トークン取得失敗（リトライ上限到達）');
      throw error;
    }
  }
  
  /**
   * メタタグを更新
   */
  private updateMetaTag(token: string): void {
    try {
      let metaTag = document.querySelector('meta[name="app-csrf-token"]');
      
      if (!metaTag) {
        metaTag = document.createElement('meta');
        metaTag.setAttribute('name', 'app-csrf-token');
        document.head.appendChild(metaTag);
      }
      
      metaTag.setAttribute('content', token);
      console.log('✅ [CSRF] メタタグ更新完了');
    } catch (error) {
      console.warn('⚠️  [CSRF] メタタグ更新エラー:', error);
    }
  }
  
  /**
   * トークンを強制的にリフレッシュ
   */
  async refreshToken(): Promise<string> {
    console.log('🔄 [CSRF] トークン強制リフレッシュ');
    this.token = null;
    this.tokenExpiry = null;
    this.retryCount = 0;
    return this.ensureToken();
  }
  
  /**
   * 現在のトークンを取得（初期化保証なし）
   */
  getCurrentToken(): string | null {
    if (this.token && !this.isTokenExpired()) {
      return this.token;
    }
    return null;
  }
  
  /**
   * トークンマネージャーをリセット（テスト用）
   */
  static reset(): void {
    if (CSRFTokenManager.instance) {
      CSRFTokenManager.instance.token = null;
      CSRFTokenManager.instance.tokenExpiry = null;
      CSRFTokenManager.instance.initPromise = null;
      CSRFTokenManager.instance.retryCount = 0;
    }
    CSRFTokenManager.instance = null;
  }
}