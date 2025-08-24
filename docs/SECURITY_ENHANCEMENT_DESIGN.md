# セキュリティ強化設計書

## 1. 概要
会員制掲示板アプリケーションのセキュリティを強化するための実装設計書

## 2. 現状分析

### 2.1 実装済み機能
| 機能 | 実装状況 | ファイル | 問題点 |
|------|---------|----------|--------|
| セキュリティヘッダー | ✅ 実装済み | `/src/lib/security/headers.ts` | なし |
| レート制限 | ⚠️ 部分実装 | `/src/lib/middleware/auth.ts`<br>`/src/middleware.ts` | 実装が統一されていない |
| XSS対策 | ⚠️ 基本実装 | `/src/lib/validations/post.ts` | 基本的なサニタイゼーションのみ |
| CSRF対策 | ❌ 無効化 | `/src/middleware.ts` (コメントアウト) | 実装が無効化されている |
| 監査ログ | ⚠️ 部分実装 | `/src/lib/security/audit-log.ts` | パスワード関連のみ |
| セッション管理 | ✅ 実装済み | NextAuth.js | なし |

## 3. 実装要件

### 3.1 レート制限（優先度: 高）
- **要件**: 1分間に5回まで
- **実装方針**: LRU Cacheベースの統一実装
- **適用対象**:
  - 認証API（/api/auth/*）
  - 投稿API（/api/posts/*）
  - ユーザーAPI（/api/users/*）

### 3.2 CSRF対策（優先度: 高）
- **要件**: Double Submit Cookie方式
- **実装方針**: 
  - CSRFトークンの生成と検証
  - SameSite Cookieの設定
  - 状態変更リクエストでの検証

### 3.3 XSS対策強化（優先度: 中）
- **要件**: DOMPurifyによる高度なサニタイゼーション
- **実装方針**:
  - isomorphic-dompurifyの導入
  - 入力時・出力時の2段階サニタイゼーション
  - Markdown対応

### 3.4 監査ログ拡充（優先度: 中）
- **要件**: 重要操作の完全記録
- **記録対象**:
  - 認証イベント（ログイン/ログアウト/失敗）
  - 投稿CRUD操作
  - ユーザープロファイル変更
  - 権限変更
  - セキュリティイベント

### 3.5 セッション管理最適化（優先度: 低）
- **要件**: セッションの適切な管理
- **実装方針**:
  - セッションタイムアウト（30分）
  - 同時セッション数制限
  - セッション固定攻撃対策

## 4. 実装計画

### Phase 1: レート制限の統一実装
```typescript
// /src/lib/security/rate-limiter-v2.ts
import { LRUCache } from 'lru-cache';

export class RateLimiterV2 {
  private cache: LRUCache<string, number[]>;
  
  constructor(options: {
    max: number;        // 最大リクエスト数
    window: number;     // 時間窓（ミリ秒）
    maxItems?: number;  // キャッシュ最大アイテム数
  }) {
    this.cache = new LRUCache({
      max: options.maxItems || 10000,
      ttl: options.window,
    });
  }
  
  async check(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const key = identifier;
    const timestamps = this.cache.get(key) || [];
    
    // 時間窓内のリクエストをフィルタ
    const recentRequests = timestamps.filter(
      t => t > now - this.window
    );
    
    if (recentRequests.length >= this.max) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: recentRequests[0] + this.window,
      };
    }
    
    recentRequests.push(now);
    this.cache.set(key, recentRequests);
    
    return {
      allowed: true,
      remaining: this.max - recentRequests.length,
      resetTime: now + this.window,
    };
  }
}
```

### Phase 2: CSRF対策の実装
```typescript
// /src/lib/security/csrf.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';

export class CSRFProtection {
  private static readonly TOKEN_LENGTH = 32;
  private static readonly COOKIE_NAME = 'csrf-token';
  private static readonly HEADER_NAME = 'x-csrf-token';
  
  static generateToken(): string {
    return crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
  }
  
  static async setToken(response: Response): Promise<void> {
    const token = this.generateToken();
    
    cookies().set(this.COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 * 24, // 24時間
    });
  }
  
  static async verifyToken(request: Request): Promise<boolean> {
    const cookieToken = cookies().get(this.COOKIE_NAME)?.value;
    const headerToken = request.headers.get(this.HEADER_NAME);
    
    if (!cookieToken || !headerToken) {
      return false;
    }
    
    return crypto.timingSafeEqual(
      Buffer.from(cookieToken),
      Buffer.from(headerToken)
    );
  }
}
```

### Phase 3: XSS対策の強化
```typescript
// /src/lib/security/sanitizer-v2.ts
import createDOMPurify from 'isomorphic-dompurify';

export class SanitizerV2 {
  private static purify = createDOMPurify();
  
  static sanitizeHTML(input: string): string {
    return this.purify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      ALLOWED_ATTR: ['href'],
    });
  }
  
  static sanitizeMarkdown(input: string): string {
    // Markdownの特殊文字をエスケープ
    return input
      .replace(/[<>]/g, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+=/gi, '');
  }
  
  static sanitizeJSON(obj: any): any {
    if (typeof obj === 'string') {
      return this.sanitizeHTML(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => this.sanitizeJSON(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = this.sanitizeJSON(value);
      }
      return sanitized;
    }
    
    return obj;
  }
}
```

### Phase 4: 監査ログの拡充
```typescript
// /src/lib/security/audit-logger.ts
export enum AuditEvent {
  // 認証イベント
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOGOUT = 'LOGOUT',
  SESSION_EXPIRED = 'SESSION_EXPIRED',
  
  // 投稿イベント
  POST_CREATE = 'POST_CREATE',
  POST_UPDATE = 'POST_UPDATE',
  POST_DELETE = 'POST_DELETE',
  
  // ユーザーイベント
  USER_UPDATE = 'USER_UPDATE',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  
  // セキュリティイベント
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  CSRF_VIOLATION = 'CSRF_VIOLATION',
  XSS_ATTEMPT = 'XSS_ATTEMPT',
}

export class AuditLogger {
  static async log(event: AuditEvent, details: {
    userId?: string;
    email?: string;
    ip?: string;
    userAgent?: string;
    data?: any;
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  }): Promise<void> {
    try {
      await AuditLog.create({
        event,
        ...details,
        timestamp: new Date(),
        severity: details.severity || this.getSeverity(event),
      });
      
      // 高優先度イベントはアラート送信
      if (details.severity === 'HIGH' || details.severity === 'CRITICAL') {
        await this.sendAlert(event, details);
      }
    } catch (error) {
      console.error('Failed to create audit log:', error);
    }
  }
  
  private static getSeverity(event: AuditEvent): string {
    const highSeverityEvents = [
      AuditEvent.LOGIN_FAILURE,
      AuditEvent.RATE_LIMIT_EXCEEDED,
      AuditEvent.CSRF_VIOLATION,
      AuditEvent.XSS_ATTEMPT,
    ];
    
    return highSeverityEvents.includes(event) ? 'HIGH' : 'LOW';
  }
  
  private static async sendAlert(event: AuditEvent, details: any): Promise<void> {
    // メール通知やSlack通知の実装
    console.warn(`🚨 Security Alert: ${event}`, details);
  }
}
```

## 5. 実装優先順位

1. **Phase 1**: レート制限の統一実装（1日）
2. **Phase 2**: CSRF対策の実装（1日）
3. **Phase 3**: XSS対策の強化（0.5日）
4. **Phase 4**: 監査ログの拡充（0.5日）
5. **テスト**: 全機能の統合テスト（1日）

## 6. テスト計画

### 6.1 単体テスト
- レート制限のしきい値テスト
- CSRFトークンの生成・検証テスト
- サニタイゼーション機能テスト
- 監査ログ記録テスト

### 6.2 統合テスト
- E2Eセキュリティテスト（Playwright）
- ペネトレーションテスト
- パフォーマンステスト

### 6.3 受入基準
```yaml
security:
  rate_limit:
    threshold: 5
    window: 60000  # 1分
    enforcement: strict
  
  csrf:
    enabled: true
    token_rotation: true
    
  xss:
    input_sanitization: true
    output_encoding: true
    
  audit:
    events_logged: all
    retention: 90  # days
    
  headers:
    csp: enforced
    hsts: enabled
    x_frame_options: DENY
```

## 7. 依存関係
```json
{
  "dependencies": {
    "lru-cache": "^10.0.0",
    "isomorphic-dompurify": "^2.0.0",
    "csrf": "^3.1.0"
  }
}
```

## 8. 監視とメトリクス

### 8.1 監視項目
- レート制限のヒット率
- CSRFトークンの検証失敗率
- XSS試行の検出数
- 監査ログのボリューム

### 8.2 アラート設定
- レート制限の閾値超過（1時間に10回以上）
- CSRF攻撃の検出
- XSS攻撃の検出
- 異常なログイン試行

## 9. ロールバック計画
各フェーズは独立して実装可能であり、問題が発生した場合は該当機能のみを無効化できる設計とする。

## 10. セキュリティチェックリスト
- [ ] OWASP Top 10への対応確認
- [ ] セキュリティヘッダーの動作確認
- [ ] レート制限の動作確認
- [ ] CSRF保護の動作確認
- [ ] XSS対策の動作確認
- [ ] 監査ログの記録確認
- [ ] ペネトレーションテストの実施
- [ ] セキュリティスキャナー（ZAP等）での検証