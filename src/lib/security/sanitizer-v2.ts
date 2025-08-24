/**
 * XSS対策 - 高度なサニタイゼーション
 * DOMPurify互換の実装
 */

export class SanitizerV2 {
  // 許可するHTMLタグ
  private static readonly ALLOWED_TAGS = [
    'b', 'i', 'em', 'strong', 'a', 'p', 'br', 
    'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
  ];
  
  // 許可する属性
  private static readonly ALLOWED_ATTRS = [
    'href', 'title', 'target', 'rel', 'class'
  ];
  
  // 危険なパターン
  private static readonly DANGEROUS_PATTERNS = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
    /<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
  ];
  
  /**
   * HTML文字列のサニタイゼーション
   */
  static sanitizeHTML(input: string): string {
    if (!input) return '';
    
    let sanitized = input;
    
    // 危険なパターンを除去
    for (const pattern of this.DANGEROUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }
    
    // HTMLエンティティのエスケープ
    sanitized = this.escapeHtml(sanitized);
    
    // 許可されたタグのみ復元
    for (const tag of this.ALLOWED_TAGS) {
      const openTagPattern = new RegExp(`&lt;(${tag})(\\s[^&]*)&gt;`, 'gi');
      const closeTagPattern = new RegExp(`&lt;/(${tag})&gt;`, 'gi');
      
      sanitized = sanitized.replace(openTagPattern, (match, tagName, attrs) => {
        const cleanAttrs = this.sanitizeAttributes(attrs);
        return `<${tagName}${cleanAttrs}>`;
      });
      
      sanitized = sanitized.replace(closeTagPattern, `</$1>`);
    }
    
    return sanitized.trim();
  }
  
  /**
   * Markdown用のサニタイゼーション
   */
  static sanitizeMarkdown(input: string): string {
    if (!input) return '';
    
    return input
      // HTMLタグを除去
      .replace(/<[^>]*>/g, '')
      // 危険なURLスキームを除去
      .replace(/javascript:/gi, '')
      .replace(/data:/gi, '')
      .replace(/vbscript:/gi, '')
      // イベントハンドラを除去
      .replace(/on\w+=/gi, '')
      .trim();
  }
  
  /**
   * JSONオブジェクトの再帰的サニタイゼーション
   */
  static sanitizeJSON(obj: any): any {
    if (obj === null || obj === undefined) {
      return obj;
    }
    
    if (typeof obj === 'string') {
      return this.sanitizeHTML(obj);
    }
    
    if (typeof obj === 'number' || typeof obj === 'boolean') {
      return obj;
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJSON(item));
    }
    
    if (obj instanceof Date) {
      return obj;
    }
    
    if (typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        // キー名もサニタイズ
        const sanitizedKey = this.sanitizeHTML(key);
        sanitized[sanitizedKey] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return obj;
  }
  
  /**
   * URLのサニタイゼーション
   */
  static sanitizeURL(url: string): string {
    if (!url) return '';
    
    // 危険なスキームをチェック
    const dangerousSchemes = ['javascript:', 'data:', 'vbscript:'];
    const lowerUrl = url.toLowerCase().trim();
    
    for (const scheme of dangerousSchemes) {
      if (lowerUrl.startsWith(scheme)) {
        return '';
      }
    }
    
    // 相対URLまたは安全なスキームのみ許可
    const safeSchemes = ['http://', 'https://', 'mailto:', '/'];
    const isSafe = safeSchemes.some(scheme => 
      lowerUrl.startsWith(scheme) || !lowerUrl.includes(':')
    );
    
    return isSafe ? url : '';
  }
  
  /**
   * ファイル名のサニタイゼーション
   */
  static sanitizeFilename(filename: string): string {
    if (!filename) return '';
    
    return filename
      // 危険な文字を除去
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
      // ディレクトリトラバーサル対策
      .replace(/\.\./g, '')
      .replace(/^\.+/, '')
      // 最大長制限
      .substring(0, 255)
      .trim();
  }
  
  /**
   * SQLインジェクション対策（エスケープ）
   */
  static escapeSql(input: string): string {
    if (!input) return '';
    
    return input
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x00/g, '\\x00')
      .replace(/\x1a/g, '\\x1a');
  }
  
  /**
   * HTMLエンティティへのエスケープ
   */
  private static escapeHtml(input: string): string {
    const map: { [key: string]: string } = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;',
    };
    
    return input.replace(/[&<>"'/]/g, char => map[char]);
  }
  
  /**
   * 属性のサニタイゼーション
   */
  private static sanitizeAttributes(attrs: string): string {
    if (!attrs) return '';
    
    const allowedAttrs: string[] = [];
    const attrRegex = /(\w+)\s*=\s*["']([^"']*)["']/g;
    let match;
    
    while ((match = attrRegex.exec(attrs)) !== null) {
      const [, attrName, attrValue] = match;
      
      // 許可された属性のみ
      if (this.ALLOWED_ATTRS.includes(attrName.toLowerCase())) {
        // href属性の場合はURLをサニタイズ
        if (attrName.toLowerCase() === 'href') {
          const sanitizedUrl = this.sanitizeURL(attrValue);
          if (sanitizedUrl) {
            allowedAttrs.push(`${attrName}="${sanitizedUrl}"`);
          }
        } else {
          // その他の属性は値をエスケープ
          const escapedValue = this.escapeHtml(attrValue);
          allowedAttrs.push(`${attrName}="${escapedValue}"`);
        }
      }
    }
    
    return allowedAttrs.length > 0 ? ' ' + allowedAttrs.join(' ') : '';
  }
  
  /**
   * CSVインジェクション対策
   */
  static sanitizeCSV(input: string): string {
    if (!input) return '';
    
    // 危険な文字で始まる場合は先頭に'を追加
    const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
    
    if (dangerousChars.some(char => input.startsWith(char))) {
      return "'" + input;
    }
    
    return input;
  }
}

// エクスポート
export const sanitizer = SanitizerV2;