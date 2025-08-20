# セキュリティ対策実装設計書

## 1. 概要

本書は、Next.js 15ベースの掲示板アプリケーションに対する包括的なセキュリティ対策の設計と実装方針を定義します。

### 対象脅威
- ブルートフォース攻撃
- XSS（クロスサイトスクリプティング）
- CSRF（クロスサイトリクエストフォージェリ）
- SQLインジェクション（NoSQLインジェクション）
- セッションハイジャック
- DDoS攻撃
- データ漏洩

## 2. アーキテクチャ設計

### 2.1 レイヤード・セキュリティアプローチ

```
┌─────────────────────────────────────────────┐
│         クライアント層                        │
│  - 入力検証                                  │
│  - CSPヘッダー                               │
│  - サニタイゼーション                         │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         ミドルウェア層                        │
│  - レート制限                                │
│  - CSRF保護                                  │
│  - セキュリティヘッダー                       │
│  - 監査ログ                                  │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         API層                                │
│  - 認証・認可                                │
│  - 入力検証                                  │
│  - データサニタイゼーション                   │
└─────────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────────┐
│         データベース層                        │
│  - パラメータ化クエリ                        │
│  - 暗号化                                    │
│  - アクセス制御                              │
└─────────────────────────────────────────────┘
```

## 3. 実装詳細

### 3.1 レート制限（Rate Limiting）

#### 設計方針
- **Token Bucket Algorithm**を使用
- IPアドレスとユーザーIDの組み合わせで制限
- エンドポイント毎に異なる制限値を設定

#### 実装構造

```typescript
// src/lib/security/rate-limiter.ts
interface RateLimitConfig {
  windowMs: number;      // 時間窓（ミリ秒）
  maxRequests: number;   // 最大リクエスト数
  identifier: string;    // 識別子（IP/UserID）
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// エンドポイント毎の設定
const RATE_LIMITS = {
  'POST:/api/posts': { windowMs: 60000, maxRequests: 5 },      // 1分間に5回
  'POST:/api/auth/signin': { windowMs: 900000, maxRequests: 5 }, // 15分間に5回
  'POST:/api/auth/signup': { windowMs: 3600000, maxRequests: 3 }, // 1時間に3回
  'PUT:/api/posts/*': { windowMs: 60000, maxRequests: 10 },     // 1分間に10回
  'DELETE:/api/posts/*': { windowMs: 60000, maxRequests: 5 },   // 1分間に5回
  'default': { windowMs: 60000, maxRequests: 100 }              // デフォルト
};
```

#### LRUキャッシュ実装

```typescript
// src/lib/cache/rate-limit-cache.ts
import { LRUCache } from 'lru-cache';

export class RateLimitCache {
  private cache: LRUCache<string, RateLimitEntry>;
  
  constructor() {
    this.cache = new LRUCache({
      max: 10000,                    // 最大10000エントリ
      ttl: 1000 * 60 * 15,          // 15分でエントリ削除
      updateAgeOnGet: false,
      updateAgeOnHas: false,
    });
  }
  
  async checkLimit(key: string, config: RateLimitConfig): Promise<boolean> {
    const now = Date.now();
    const entry = this.cache.get(key) || { count: 0, resetTime: now + config.windowMs };
    
    if (now > entry.resetTime) {
      // 時間窓リセット
      entry.count = 1;
      entry.resetTime = now + config.windowMs;
    } else {
      entry.count++;
    }
    
    this.cache.set(key, entry);
    return entry.count <= config.maxRequests;
  }
}
```

### 3.2 セキュリティヘッダー

#### 実装するヘッダー

```typescript
// src/middleware.ts
const SECURITY_HEADERS = {
  // XSS Protection
  'X-XSS-Protection': '1; mode=block',
  
  // Content Type Options
  'X-Content-Type-Options': 'nosniff',
  
  // Frame Options (Clickjacking対策)
  'X-Frame-Options': 'DENY',
  
  // Content Security Policy
  'Content-Security-Policy': [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; '),
  
  // Referrer Policy
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Permissions Policy
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  
  // HSTS (本番環境のみ)
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
};
```

### 3.3 XSS対策

#### 入力サニタイゼーション

```typescript
// src/lib/security/sanitizer.ts
import DOMPurify from 'isomorphic-dompurify';

export class InputSanitizer {
  // HTMLサニタイゼーション
  static sanitizeHTML(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br'],
      ALLOWED_ATTR: []
    });
  }
  
  // テキストサニタイゼーション
  static sanitizeText(input: string): string {
    return input
      .replace(/[<>]/g, '')           // HTMLタグ除去
      .replace(/javascript:/gi, '')    // JavaScriptプロトコル除去
      .replace(/on\w+=/gi, '')         // イベントハンドラ除去
      .trim();
  }
  
  // MongoDBクエリサニタイゼーション
  static sanitizeQuery(input: any): any {
    if (typeof input === 'string') {
      // $演算子の無効化
      return input.replace(/[$]/g, '');
    }
    if (typeof input === 'object' && input !== null) {
      const sanitized: any = {};
      for (const key in input) {
        if (!key.startsWith('$')) {
          sanitized[key] = this.sanitizeQuery(input[key]);
        }
      }
      return sanitized;
    }
    return input;
  }
}
```

#### 出力エスケープ

```typescript
// src/lib/security/escape.ts
export class OutputEscaper {
  // HTML属性エスケープ
  static escapeHtml(str: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#x27;',
      '/': '&#x2F;'
    };
    return str.replace(/[&<>"'/]/g, (s) => map[s]);
  }
  
  // JavaScript文字列エスケープ
  static escapeJs(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
```

### 3.4 CSRF対策

#### トークンベース保護

```typescript
// src/lib/security/csrf.ts
import crypto from 'crypto';
import { cookies } from 'next/headers';

export class CSRFProtection {
  private static TOKEN_LENGTH = 32;
  private static TOKEN_NAME = 'csrf-token';
  
  // トークン生成
  static async generateToken(): Promise<string> {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const cookieStore = await cookies();
    
    cookieStore.set(this.TOKEN_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 // 24時間
    });
    
    return token;
  }
  
  // トークン検証
  static async verifyToken(token: string): Promise<boolean> {
    const cookieStore = await cookies();
    const storedToken = cookieStore.get(this.TOKEN_NAME)?.value;
    
    if (!storedToken || !token) {
      return false;
    }
    
    // タイミング攻撃対策
    return crypto.timingSafeEqual(
      Buffer.from(storedToken),
      Buffer.from(token)
    );
  }
}
```

#### ミドルウェア実装

```typescript
// src/middleware/csrf.ts
export async function csrfMiddleware(req: NextRequest) {
  // GETリクエストはスキップ
  if (req.method === 'GET' || req.method === 'HEAD') {
    return NextResponse.next();
  }
  
  // CSRFトークン検証
  const token = req.headers.get('X-CSRF-Token') || 
                req.cookies.get('csrf-token')?.value;
  
  if (!token || !(await CSRFProtection.verifyToken(token))) {
    return NextResponse.json(
      { error: 'Invalid CSRF token' },
      { status: 403 }
    );
  }
  
  return NextResponse.next();
}
```

### 3.5 セッション管理の最適化

#### セキュアなセッション設定

```typescript
// src/lib/auth/session-config.ts
export const SESSION_CONFIG = {
  // セッション有効期限
  maxAge: 30 * 24 * 60 * 60, // 30日
  updateAge: 24 * 60 * 60,    // 24時間毎に更新
  
  // Cookie設定
  cookie: {
    name: 'session',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
  },
  
  // セッション暗号化
  secret: process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex'),
  
  // セッションストレージ（Redis推奨）
  adapter: MongoDBAdapter,
  
  // セッションローテーション
  rotateSession: true,
  rotateInterval: 60 * 60 * 24 * 7, // 週次ローテーション
};
```

#### セッション固定攻撃対策

```typescript
// src/lib/auth/session-manager.ts
export class SessionManager {
  // ログイン時のセッション再生成
  static async regenerateSession(userId: string): Promise<string> {
    // 古いセッションを無効化
    await this.invalidateExistingSessions(userId);
    
    // 新しいセッションID生成
    const sessionId = crypto.randomBytes(32).toString('hex');
    
    // フィンガープリント生成
    const fingerprint = await this.generateFingerprint();
    
    // セッション保存
    await this.saveSession({
      id: sessionId,
      userId,
      fingerprint,
      createdAt: new Date(),
      lastActivity: new Date(),
    });
    
    return sessionId;
  }
  
  // デバイスフィンガープリント
  private static async generateFingerprint(): Promise<string> {
    // User-Agent、IP、Accept-Languageなどから生成
    return crypto
      .createHash('sha256')
      .update(/* フィンガープリント要素 */)
      .digest('hex');
  }
}
```

### 3.6 監査ログ実装

#### ログスキーマ設計

```typescript
// src/models/AuditLog.ts
interface AuditLog {
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  action: string;           // 実行されたアクション
  resource: string;         // 対象リソース
  resourceId?: string;      // リソースID
  method: string;          // HTTPメソッド
  path: string;            // リクエストパス
  ip: string;              // IPアドレス
  userAgent: string;       // User-Agent
  status: number;          // レスポンスステータス
  duration: number;        // 処理時間（ms）
  error?: string;          // エラーメッセージ
  metadata?: Record<string, any>; // 追加メタデータ
}
```

#### ログ収集システム

```typescript
// src/lib/security/audit-logger.ts
export class AuditLogger {
  private static queue: AuditLog[] = [];
  private static BATCH_SIZE = 100;
  private static FLUSH_INTERVAL = 5000; // 5秒
  
  static log(entry: Partial<AuditLog>): void {
    const log: AuditLog = {
      timestamp: new Date(),
      ...entry
    };
    
    this.queue.push(log);
    
    // バッチサイズに達したら即座にフラッシュ
    if (this.queue.length >= this.BATCH_SIZE) {
      this.flush();
    }
  }
  
  private static async flush(): Promise<void> {
    if (this.queue.length === 0) return;
    
    const logs = [...this.queue];
    this.queue = [];
    
    try {
      // MongoDBに一括挿入
      await AuditLogModel.insertMany(logs);
      
      // 重要なイベントは外部システムにも送信
      const criticalLogs = logs.filter(l => 
        l.action === 'DELETE' || 
        l.status >= 400 ||
        l.action.includes('admin')
      );
      
      if (criticalLogs.length > 0) {
        await this.sendToSIEM(criticalLogs);
      }
    } catch (error) {
      console.error('Audit log flush failed:', error);
      // 失敗したログは再度キューに戻す
      this.queue.unshift(...logs);
    }
  }
  
  // 定期フラッシュ
  static startPeriodicFlush(): void {
    setInterval(() => this.flush(), this.FLUSH_INTERVAL);
  }
}
```

#### 監査対象イベント

```typescript
// src/lib/security/audit-events.ts
export enum AuditEvent {
  // 認証関連
  LOGIN_SUCCESS = 'auth.login.success',
  LOGIN_FAILURE = 'auth.login.failure',
  LOGOUT = 'auth.logout',
  SIGNUP = 'auth.signup',
  PASSWORD_CHANGE = 'auth.password.change',
  PASSWORD_RESET = 'auth.password.reset',
  
  // 投稿関連
  POST_CREATE = 'post.create',
  POST_UPDATE = 'post.update',
  POST_DELETE = 'post.delete',
  POST_VIEW = 'post.view',
  
  // 管理操作
  USER_UPDATE = 'admin.user.update',
  USER_DELETE = 'admin.user.delete',
  ROLE_CHANGE = 'admin.role.change',
  
  // セキュリティイベント
  RATE_LIMIT_EXCEEDED = 'security.rate_limit',
  CSRF_VIOLATION = 'security.csrf',
  XSS_ATTEMPT = 'security.xss',
  SQL_INJECTION_ATTEMPT = 'security.injection',
  UNAUTHORIZED_ACCESS = 'security.unauthorized',
}
```

## 4. 統合ミドルウェア実装

```typescript
// src/middleware.ts
import { NextRequest, NextResponse } from 'next/server';
import { RateLimiter } from '@/lib/security/rate-limiter';
import { CSRFProtection } from '@/lib/security/csrf';
import { AuditLogger } from '@/lib/security/audit-logger';
import { InputSanitizer } from '@/lib/security/sanitizer';

export async function middleware(req: NextRequest) {
  const startTime = Date.now();
  let response: NextResponse;
  
  try {
    // 1. セキュリティヘッダー設定
    response = NextResponse.next();
    Object.entries(SECURITY_HEADERS).forEach(([key, value]) => {
      response.headers.set(key, value);
    });
    
    // 2. レート制限チェック
    const rateLimitKey = `${req.ip}:${req.nextUrl.pathname}`;
    const allowed = await RateLimiter.check(rateLimitKey, req);
    
    if (!allowed) {
      AuditLogger.log({
        action: AuditEvent.RATE_LIMIT_EXCEEDED,
        ip: req.ip || 'unknown',
        path: req.nextUrl.pathname,
        method: req.method,
        status: 429
      });
      
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429, headers: response.headers }
      );
    }
    
    // 3. CSRF保護（POST/PUT/DELETE）
    if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
      const csrfValid = await CSRFProtection.verifyToken(
        req.headers.get('X-CSRF-Token') || ''
      );
      
      if (!csrfValid) {
        AuditLogger.log({
          action: AuditEvent.CSRF_VIOLATION,
          ip: req.ip || 'unknown',
          path: req.nextUrl.pathname,
          method: req.method,
          status: 403
        });
        
        return NextResponse.json(
          { error: 'CSRF token validation failed' },
          { status: 403, headers: response.headers }
        );
      }
    }
    
    // 4. 入力サニタイゼーション（Body処理）
    if (req.body) {
      try {
        const body = await req.json();
        const sanitized = InputSanitizer.sanitizeQuery(body);
        
        // サニタイズしたボディを新しいリクエストに設定
        const newRequest = new NextRequest(req.url, {
          method: req.method,
          headers: req.headers,
          body: JSON.stringify(sanitized)
        });
        
        req = newRequest;
      } catch (e) {
        // JSONパースエラーは無視
      }
    }
    
    // 5. 監査ログ記録
    const auditEntry = {
      path: req.nextUrl.pathname,
      method: req.method,
      ip: req.ip || 'unknown',
      userAgent: req.headers.get('user-agent') || 'unknown',
      timestamp: new Date()
    };
    
    // レスポンス後にログ記録
    response = NextResponse.next();
    
    // 処理時間を記録
    const duration = Date.now() - startTime;
    AuditLogger.log({
      ...auditEntry,
      duration,
      status: response.status
    });
    
    return response;
    
  } catch (error) {
    // エラーログ
    AuditLogger.log({
      action: 'middleware.error',
      error: error instanceof Error ? error.message : 'Unknown error',
      path: req.nextUrl.pathname,
      method: req.method,
      ip: req.ip || 'unknown',
      status: 500,
      duration: Date.now() - startTime
    });
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// ミドルウェアを適用するパス
export const config = {
  matcher: [
    '/api/:path*',
    '/board/:path*',
    '/dashboard/:path*',
    '/profile/:path*',
    '/admin/:path*'
  ]
};
```

## 5. 実装優先順位

### Phase 1: 基本セキュリティ（即座に実装）
1. **レート制限** - DDoS攻撃防止
2. **セキュリティヘッダー** - 基本的な攻撃防止
3. **入力サニタイゼーション** - XSS/インジェクション防止

### Phase 2: 認証・認可強化（1週間以内）
4. **CSRF対策** - リクエスト偽造防止
5. **セッション管理最適化** - セッションハイジャック防止

### Phase 3: 監視・監査（2週間以内）
6. **監査ログ** - セキュリティインシデント追跡
7. **アラート機能** - リアルタイム脅威検知

## 6. テスト戦略

### 6.1 セキュリティテスト

```typescript
// tests/security/rate-limit.test.ts
describe('Rate Limiting', () => {
  it('should block after exceeding limit', async () => {
    for (let i = 0; i < 5; i++) {
      const res = await fetch('/api/posts', { method: 'POST' });
      expect(res.status).toBe(201);
    }
    
    const res = await fetch('/api/posts', { method: 'POST' });
    expect(res.status).toBe(429); // Too Many Requests
  });
});
```

### 6.2 ペネトレーションテスト

```bash
# OWASP ZAPによる自動スキャン
docker run -t owasp/zap2docker-stable zap-baseline.py \
  -t http://localhost:3000

# SQLMap（NoSQLインジェクションテスト）
sqlmap -u "http://localhost:3000/api/posts?id=1" \
  --batch --random-agent
```

## 7. モニタリング

### 7.1 メトリクス収集

```typescript
// src/lib/monitoring/metrics.ts
export const SecurityMetrics = {
  rateLimitHits: new Counter({
    name: 'rate_limit_hits_total',
    help: 'Total number of rate limit hits',
    labelNames: ['endpoint', 'ip']
  }),
  
  csrfViolations: new Counter({
    name: 'csrf_violations_total',
    help: 'Total number of CSRF violations'
  }),
  
  authFailures: new Counter({
    name: 'auth_failures_total',
    help: 'Total number of authentication failures',
    labelNames: ['type']
  }),
  
  suspiciousActivities: new Counter({
    name: 'suspicious_activities_total',
    help: 'Total number of suspicious activities detected',
    labelNames: ['type']
  })
};
```

### 7.2 アラート設定

```yaml
# monitoring/alerts.yml
alerts:
  - name: HighRateLimitHits
    condition: rate(rate_limit_hits_total[5m]) > 100
    severity: warning
    
  - name: CSRFAttackDetected
    condition: rate(csrf_violations_total[1m]) > 10
    severity: critical
    
  - name: BruteForceAttempt
    condition: rate(auth_failures_total[5m]) > 50
    severity: critical
```

## 8. セキュリティチェックリスト

### 開発時
- [ ] 入力値の検証とサニタイゼーション
- [ ] 出力値のエスケープ
- [ ] パラメータ化クエリの使用
- [ ] 機密情報のログ出力禁止
- [ ] エラーメッセージの適切な処理

### デプロイ前
- [ ] セキュリティヘッダーの設定確認
- [ ] HTTPS強制の確認
- [ ] 環境変数の適切な管理
- [ ] デバッグモードの無効化
- [ ] セキュリティスキャンの実施

### 運用時
- [ ] 定期的なセキュリティアップデート
- [ ] ログの定期的な監査
- [ ] アクセスパターンの監視
- [ ] インシデント対応計画の準備
- [ ] バックアップとリカバリのテスト

## 9. コンプライアンス考慮事項

### GDPR対応
- ユーザーデータの暗号化
- データポータビリティの実装
- 忘れられる権利の実装
- プライバシーポリシーの明示

### 日本国内法対応
- 個人情報保護法準拠
- 不正アクセス防止法準拠
- 電子計算機使用詐欺防止

## 10. まとめ

本設計書に基づいて実装することで、OWASP Top 10に対応した堅牢なセキュリティを実現できます。実装は優先順位に従って段階的に進め、各フェーズでテストを実施してください。

---

**作成日**: 2025年8月14日  
**バージョン**: 1.0.0  
**Next.js**: 15.4.5  
**作成者**: セキュリティアーキテクト