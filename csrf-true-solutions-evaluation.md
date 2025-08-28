# CSRF保護問題の真の解決策評価レポート

## 実行日時
2025-08-28T19:30:00 JST

## エグゼクティブサマリー

### 問題の真因
- **二重CSRF保護システム**: NextAuth CSRF + 独自アプリCSRFが競合
- **現在の暫定対応**: `/api/users`以下のCSRF保護を無効化（認証は有効）
- **根本的な解決が必要**: セキュリティリスクの完全排除

### 解決策の優先順位（1-4）

## 優先度1: トークン同期メカニズムの実装
**リスク**: 低 | **実装工数**: 小 | **影響範囲**: 最小

### 概要
既存の二重CSRF保護を維持しつつ、トークンを同期させる

### 実装内容
```typescript
// src/lib/security/csrf-sync.ts
export class CSRFTokenSync {
  static async syncTokens(request: NextRequest): Promise<boolean> {
    // NextAuthのCSRFトークンを取得
    const nextAuthToken = await this.getNextAuthCSRF(request);
    // アプリCSRFトークンを取得
    const appToken = CSRFProtection.getTokenFromRequest(request);
    
    // 同期ロジック
    if (nextAuthToken && !appToken.headerToken) {
      // NextAuthトークンをアプリトークンとして設定
      request.headers.set('x-csrf-token', nextAuthToken);
      return true;
    }
    
    return appToken.headerToken === appToken.cookieToken;
  }
}
```

### 影響範囲
- middleware.ts の検証ロジック修正
- CSRFProvider.tsx の取得ロジック調整
- 既存APIは変更不要

### メリット
- 既存システムとの互換性維持
- 段階的移行が可能
- ロールバック容易

### デメリット
- 複雑性が残存
- 長期的な技術負債

---

## 優先度2: 独自CSRF完全修正
**リスク**: 中 | **実装工数**: 中 | **影響範囲**: 中

### 概要
独自CSRFシステムを完全に修正し、NextAuthと独立動作させる

### 実装内容
```typescript
// middleware.ts の修正
const csrfExcludedPaths = [
  '/api/auth',      // NextAuth管理
  '/api/register',  // 公開API
  // '/api/users' を削除（CSRF保護有効化）
];

// CSRFProvider.tsx の強化
export function useSecureFetch() {
  // トークン取得の確実性向上
  const token = await tokenManager.ensureToken({
    retryCount: 3,
    timeout: 5000,
    fallback: 'generate-new'
  });
}
```

### 影響範囲
- 全クライアントコンポーネント
- CSRFProvider の再実装
- エラーハンドリング強化

### メリット
- 明確な責任分離
- デバッグ容易
- 独立したセキュリティレイヤー

### デメリット
- 実装工数が大きい
- テスト範囲が広い

---

## 優先度3: NextAuth CSRFへの完全統一
**リスク**: 高 | **実装工数**: 大 | **影響範囲**: 大

### 概要
独自CSRFを完全廃止し、NextAuth CSRFに統一

### 実装内容
```typescript
// 独自CSRFの削除
- src/lib/security/csrf-protection.ts
- src/lib/security/csrf-token-manager.ts
- src/components/CSRFProvider.tsx

// NextAuth CSRFの利用
import { getCsrfToken } from 'next-auth/react';

export function useSecureFetch() {
  const csrfToken = await getCsrfToken();
  headers.set('x-csrf-token', csrfToken);
}
```

### 影響範囲
- 全コンポーネント
- 全APIエンドポイント
- middleware.ts の全面改修

### メリット
- シンプルなアーキテクチャ
- NextAuthの更新に追従
- メンテナンス性向上

### デメリット
- 移行リスクが大きい
- NextAuth依存度増加
- カスタマイズ性低下

---

## 優先度4: エッジランタイム最適化
**リスク**: 低 | **実装工数**: 小 | **影響範囲**: 小

### 概要
Edge Runtime専用のCSRF保護実装

### 実装内容
```typescript
// Edge Runtime最適化版
export class EdgeCSRFProtection {
  static async verifyToken(request: Request): Promise<boolean> {
    // Web Crypto API使用
    const encoder = new TextEncoder();
    const data = encoder.encode(token);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // タイミング攻撃対策
    return crypto.subtle.timingSafeEqual(expected, actual);
  }
}
```

### 影響範囲
- middleware.ts のみ
- パフォーマンス向上
- セキュリティ強化

### メリット
- 高速化
- セキュリティ向上
- Edge Runtime最適

### デメリット
- 限定的な改善
- 根本解決にならない

---

## 推奨実装順序

1. **即座**: 優先度1（トークン同期）を実装
2. **1週間以内**: 優先度2（独自CSRF修正）を実装
3. **1ヶ月以内**: 優先度3の評価とPOC
4. **随時**: 優先度4（Edge最適化）を適用

## リスクマトリクス

| 解決策 | 技術リスク | ビジネスリスク | 実装期間 | ROI |
|--------|-----------|---------------|---------|-----|
| 優先度1 | 低 | 低 | 1日 | 高 |
| 優先度2 | 中 | 低 | 3日 | 高 |
| 優先度3 | 高 | 中 | 1週間 | 中 |
| 優先度4 | 低 | 低 | 0.5日 | 低 |

## 既存機能への影響分析

### 優先度1の影響
- ✅ 認証機能: 影響なし
- ✅ セッション管理: 影響なし
- ✅ フォローAPI: 改善
- ✅ その他API: 影響なし

### 優先度2の影響
- ⚠️ CSRFProvider利用コンポーネント: 要テスト
- ✅ 認証機能: 影響なし
- ✅ APIエンドポイント: 改善

### 優先度3の影響
- ⚠️ 全クライアントコンポーネント: 要改修
- ⚠️ 全APIエンドポイント: 要テスト
- ⚠️ middleware: 全面改修

### 優先度4の影響
- ✅ 全機能: 影響なし（パフォーマンス向上のみ）

---

署名: Auth Owner (#29)
承認: SEC (#18), QA-AUTO (#22)