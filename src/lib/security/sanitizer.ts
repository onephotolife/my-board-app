export class InputSanitizer {
  /**
   * HTMLサニタイゼーション
   * 許可されたタグとその属性のみを残す
   */
  static sanitizeHTML(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // サーバーサイドでの簡易実装
    // 危険なタグとイベントハンドラを除去
    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '')
      .replace(/javascript:/gi, '');
  }

  /**
   * プレーンテキストサニタイゼーション
   * 危険な文字列パターンを除去
   */
  static sanitizeText(input: string): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    return input
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // scriptタグ完全除去
      .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '') // iframeタグ完全除去
      .replace(/javascript:/gi, '')                                        // JavaScriptプロトコル除去
      .replace(/on\w+\s*=/gi, '')                                         // イベントハンドラ除去
      .replace(/[<>]/g, '')                                               // HTMLタグ記号除去
      .trim()
      .substring(0, 10000);                                               // 最大長制限
  }

  /**
   * MongoDBクエリサニタイゼーション
   * NoSQLインジェクション対策
   */
  static sanitizeQuery(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    // 文字列の場合
    if (typeof input === 'string') {
      // MongoDB演算子の無効化
      return input
        .replace(/[$]/g, '＄')      // $記号を全角に変換
        .replace(/\./g, '．')       // .記号を全角に変換（ネストアクセス防止）
        .substring(0, 5000);        // 最大長制限
    }

    // 配列の場合
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeQuery(item));
    }

    // オブジェクトの場合
    if (typeof input === 'object') {
      const sanitized: any = {};
      
      for (const key in input) {
        // MongoDB演算子で始まるキーを除外
        if (key.startsWith('$')) {
          console.warn(`Potentially malicious key detected and removed: ${key}`);
          continue;
        }
        
        // __proto__などの危険なキーを除外
        if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
          console.warn(`Dangerous key detected and removed: ${key}`);
          continue;
        }

        sanitized[key] = this.sanitizeQuery(input[key]);
      }
      
      return sanitized;
    }

    // その他の型はそのまま返す
    return input;
  }

  /**
   * ファイル名サニタイゼーション
   */
  static sanitizeFilename(filename: string): string {
    if (!filename || typeof filename !== 'string') {
      return 'file';
    }

    return filename
      .replace(/[^a-zA-Z0-9._-]/g, '_')  // 英数字、ピリオド、ハイフン、アンダースコア以外を置換
      .replace(/\.{2,}/g, '.')            // 連続するピリオドを単一に
      .replace(/^\.+|\.+$/g, '')          // 先頭と末尾のピリオドを除去
      .substring(0, 255);                 // 最大長制限
  }

  /**
   * URLサニタイゼーション
   */
  static sanitizeURL(url: string): string | null {
    if (!url || typeof url !== 'string') {
      return null;
    }

    try {
      const parsed = new URL(url);
      
      // 許可されたプロトコルのみ
      const allowedProtocols = ['http:', 'https:'];
      if (!allowedProtocols.includes(parsed.protocol)) {
        return null;
      }

      // JavaScriptプロトコルの二重チェック
      if (url.toLowerCase().includes('javascript:')) {
        return null;
      }

      return parsed.toString();
    } catch {
      return null;
    }
  }

  /**
   * メールアドレスサニタイゼーション
   */
  static sanitizeEmail(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    // 基本的なメール形式の検証
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    
    const sanitized = email
      .toLowerCase()
      .trim()
      .substring(0, 254); // RFC5321の最大長

    return emailRegex.test(sanitized) ? sanitized : '';
  }

  /**
   * 数値サニタイゼーション
   */
  static sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input);
    
    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return min;
    }

    if (max !== undefined && num > max) {
      return max;
    }

    return num;
  }

  /**
   * 配列サニタイゼーション
   */
  static sanitizeArray<T>(
    input: any,
    itemSanitizer: (item: any) => T,
    maxLength: number = 1000
  ): T[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .slice(0, maxLength)
      .map(item => itemSanitizer(item))
      .filter(item => item !== null && item !== undefined);
  }

  /**
   * JSONサニタイゼーション
   */
  static sanitizeJSON(input: string): any {
    if (!input || typeof input !== 'string') {
      return null;
    }

    try {
      const parsed = JSON.parse(input);
      return this.sanitizeQuery(parsed);
    } catch {
      return null;
    }
  }

  /**
   * バッチサニタイゼーション
   * 複数のフィールドを一度にサニタイズ
   */
  static sanitizeBatch(data: Record<string, any>, rules: Record<string, string>): Record<string, any> {
    const sanitized: Record<string, any> = {};

    for (const [field, rule] of Object.entries(rules)) {
      const value = data[field];

      switch (rule) {
        case 'html':
          sanitized[field] = this.sanitizeHTML(value);
          break;
        case 'text':
          sanitized[field] = this.sanitizeText(value);
          break;
        case 'email':
          sanitized[field] = this.sanitizeEmail(value);
          break;
        case 'url':
          sanitized[field] = this.sanitizeURL(value);
          break;
        case 'filename':
          sanitized[field] = this.sanitizeFilename(value);
          break;
        case 'number':
          sanitized[field] = this.sanitizeNumber(value);
          break;
        case 'query':
          sanitized[field] = this.sanitizeQuery(value);
          break;
        default:
          sanitized[field] = value;
      }
    }

    return sanitized;
  }
}