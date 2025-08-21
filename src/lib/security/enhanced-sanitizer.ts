import { InputSanitizer } from './sanitizer';

/**
 * 強化されたサニタイザークラス
 * XSS, SQLi, NoSQLi対策を含む包括的なセキュリティ実装
 */
export class EnhancedSanitizer extends InputSanitizer {
  /**
   * URLパラメータの完全なサニタイゼーション
   * XSSペイロードを安全に処理
   */
  static sanitizeURLParam(input: string | null): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // URLデコード（複数回エンコードされた攻撃を防ぐ）
    let decoded = input;
    let previousDecoded = '';
    let decodeCount = 0;
    const maxDecodeAttempts = 3;

    while (decoded !== previousDecoded && decodeCount < maxDecodeAttempts) {
      previousDecoded = decoded;
      try {
        decoded = decodeURIComponent(decoded);
      } catch {
        // デコードエラーの場合は現在の値を使用
        break;
      }
      decodeCount++;
    }

    // XSSペイロードの検出と除去
    const xssPatterns = [
      /<script[^>]*>.*?<\/script>/gi,
      /<iframe[^>]*>.*?<\/iframe>/gi,
      /<object[^>]*>.*?<\/object>/gi,
      /<embed[^>]*>/gi,
      /<applet[^>]*>.*?<\/applet>/gi,
      /javascript:/gi,
      /vbscript:/gi,
      /onload\s*=/gi,
      /onerror\s*=/gi,
      /onclick\s*=/gi,
      /onmouseover\s*=/gi,
      /on\w+\s*=/gi,
      /<img[^>]*src[^>]*>/gi,
      /eval\s*\(/gi,
      /expression\s*\(/gi,
      /alert\s*\(/gi,
      /confirm\s*\(/gi,
      /prompt\s*\(/gi,
    ];

    let sanitized = decoded;
    for (const pattern of xssPatterns) {
      sanitized = sanitized.replace(pattern, '');
    }

    // HTMLエンティティエスケープ
    sanitized = sanitized
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');

    // 最大長制限
    return sanitized.substring(0, 1000);
  }

  /**
   * MongoDBクエリパラメータの強化サニタイゼーション
   * SQLインジェクション風の攻撃を防ぐ
   */
  static sanitizeMongoQuery(input: any): any {
    if (input === null || input === undefined) {
      return input;
    }

    // 文字列の場合
    if (typeof input === 'string') {
      // SQL風インジェクションパターンの検出
      const sqlPatterns = [
        /(\b(OR|AND)\b\s+['"]*\d+['"]*\s*=\s*['"]*\d+)/gi,
        /(\b(OR|AND)\b\s+['"]*\w+['"]*\s*=\s*['"]*\w+)/gi,
        /(;\s*(DROP|DELETE|UPDATE|INSERT|ALTER)\s+)/gi,
        /(\-\-|\/\*|\*\/|xp_|sp_|0x)/gi,
      ];

      let sanitized = input;
      for (const pattern of sqlPatterns) {
        if (pattern.test(sanitized)) {
          console.warn('Potential injection attempt detected:', input);
          return ''; // 攻撃的なパターンが検出された場合は空文字を返す
        }
      }

      // MongoDB演算子の無効化
      sanitized = sanitized
        .replace(/\$/g, '')           // $記号を除去
        .replace(/\./g, '_')          // ドット記号をアンダースコアに
        .replace(/[{}]/g, '')         // 中括弧を除去
        .replace(/\[|\]/g, '')        // 角括弧を除去
        .substring(0, 500);           // 最大長制限

      return sanitized;
    }

    // 配列の場合は再帰的に処理
    if (Array.isArray(input)) {
      return input.map(item => this.sanitizeMongoQuery(item));
    }

    // オブジェクトの場合
    if (typeof input === 'object') {
      const sanitized: any = {};
      
      for (const key in input) {
        // 危険なキーのブロック
        const dangerousKeys = [
          '$where', '$regex', '$options', '$expr', '$jsonSchema',
          '__proto__', 'constructor', 'prototype', '$function'
        ];
        
        if (dangerousKeys.includes(key)) {
          console.warn(`Dangerous MongoDB operator blocked: ${key}`);
          continue;
        }

        // キーが$で始まる場合は除外
        if (key.startsWith('$')) {
          console.warn(`MongoDB operator blocked: ${key}`);
          continue;
        }

        sanitized[key] = this.sanitizeMongoQuery(input[key]);
      }
      
      return sanitized;
    }

    return input;
  }

  /**
   * IDパラメータの検証とサニタイゼーション
   * MongoDB ObjectIDの形式を厳密にチェック
   */
  static sanitizeObjectId(id: string): string | null {
    if (!id || typeof id !== 'string') {
      return null;
    }

    // MongoDB ObjectIDの正規表現（24文字の16進数）
    const objectIdRegex = /^[0-9a-fA-F]{24}$/;
    
    // 余分な空白を除去
    const trimmed = id.trim();
    
    // 形式チェック
    if (!objectIdRegex.test(trimmed)) {
      console.warn('Invalid ObjectID format:', id);
      return null;
    }

    return trimmed.toLowerCase();
  }

  /**
   * 検索クエリの安全な処理
   * 全文検索用のサニタイゼーション
   */
  static sanitizeSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      return '';
    }

    // 特殊文字のエスケープ（正規表現用）
    const escaped = query
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')  // 正規表現特殊文字をエスケープ
      .replace(/[<>]/g, '')                     // HTMLタグ記号を除去
      .trim()
      .substring(0, 100);                       // 最大100文字

    // 空白で分割して各単語を処理
    const words = escaped.split(/\s+/).filter(word => word.length > 0);
    
    // 最大10単語まで
    return words.slice(0, 10).join(' ');
  }

  /**
   * HTTPヘッダーの値をサニタイズ
   * ヘッダーインジェクション攻撃を防ぐ
   */
  static sanitizeHeader(value: string): string {
    if (!value || typeof value !== 'string') {
      return '';
    }

    // 改行文字とキャリッジリターンを除去
    return value
      .replace(/[\r\n]/g, '')
      .replace(/[\x00-\x1F\x7F]/g, '') // 制御文字を除去
      .substring(0, 8192);              // HTTPヘッダーの一般的な最大長
  }

  /**
   * CSPセーフなインラインスタイル/スクリプトのnonce生成
   */
  static generateCSPNonce(): string {
    const array = new Uint8Array(16);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(array);
    } else {
      // サーバーサイドの場合
      const crypto = require('crypto');
      crypto.randomFillSync(array);
    }
    return Buffer.from(array).toString('base64');
  }

  /**
   * バッチ検証とサニタイゼーション
   * 複数のフィールドを一度に処理
   */
  static sanitizeRequestBody(body: any, schema: Record<string, any>): {
    isValid: boolean;
    sanitized: any;
    errors: string[];
  } {
    const errors: string[] = [];
    const sanitized: any = {};

    for (const [field, rules] of Object.entries(schema)) {
      const value = body[field];
      const { type, required, sanitize, maxLength, pattern } = rules as any;

      // 必須チェック
      if (required && (value === undefined || value === null || value === '')) {
        errors.push(`${field} is required`);
        continue;
      }

      // 値が存在しない場合はスキップ
      if (value === undefined || value === null) {
        continue;
      }

      // 型チェック
      if (type && typeof value !== type) {
        errors.push(`${field} must be of type ${type}`);
        continue;
      }

      // サニタイゼーション実行
      let sanitizedValue = value;
      switch (sanitize) {
        case 'text':
          sanitizedValue = this.sanitizeText(value);
          break;
        case 'html':
          sanitizedValue = this.sanitizeHTML(value);
          break;
        case 'email':
          sanitizedValue = this.sanitizeEmail(value);
          break;
        case 'url':
          sanitizedValue = this.sanitizeURL(value);
          break;
        case 'urlParam':
          sanitizedValue = this.sanitizeURLParam(value);
          break;
        case 'mongoQuery':
          sanitizedValue = this.sanitizeMongoQuery(value);
          break;
        case 'objectId':
          sanitizedValue = this.sanitizeObjectId(value);
          if (!sanitizedValue) {
            errors.push(`${field} is not a valid ObjectId`);
            continue;
          }
          break;
        case 'search':
          sanitizedValue = this.sanitizeSearchQuery(value);
          break;
        case 'number':
          sanitizedValue = this.sanitizeNumber(value);
          if (sanitizedValue === null) {
            errors.push(`${field} must be a valid number`);
            continue;
          }
          break;
      }

      // 最大長チェック
      if (maxLength && typeof sanitizedValue === 'string' && sanitizedValue.length > maxLength) {
        sanitizedValue = sanitizedValue.substring(0, maxLength);
      }

      // パターンマッチング
      if (pattern && typeof sanitizedValue === 'string') {
        const regex = new RegExp(pattern);
        if (!regex.test(sanitizedValue)) {
          errors.push(`${field} does not match the required pattern`);
          continue;
        }
      }

      sanitized[field] = sanitizedValue;
    }

    return {
      isValid: errors.length === 0,
      sanitized,
      errors
    };
  }
}