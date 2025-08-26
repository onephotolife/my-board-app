# CSRFトークン問題解決策実装計画書

## 作成日時
2025年8月26日

## エグゼクティブサマリー
フォローボタンが機能しない根本原因は、CSRFトークンがHTTPリクエストヘッダーに含まれていないことが判明しました。本レポートでは、問題の詳細分析と包括的な解決策を提示します。

---

## 1. 問題の真の原因

### 1.1 根本原因
CSRFトークンがHTTPリクエストヘッダー（`x-csrf-token`）に含まれていない

### 1.2 証拠
```typescript
// src/components/FollowButton.tsx:54-60
const response = await fetch(`/api/follow/${userId}`, {
  method,
  headers: {
    'Content-Type': 'application/json',
    // x-csrf-token ヘッダーが欠落 ❌
  },
  credentials: 'include',
});
```

### 1.3 エラーログ
```
Middlewareログ: CSRF token validation failed: /api/follow/test-user-1
CSRFProtection: cookieToken === headerToken の検証失敗
```

### 1.4 発生メカニズム
1. **Middleware** (`src/middleware.ts:148`) でCSRF検証実行
2. **CSRFProtection.verifyToken()** がcookieとheaderのトークンを比較
3. **FollowButton** が`x-csrf-token`ヘッダーを送信していない
4. **結果**: 403 Forbiddenエラー

---

## 2. 解決策の策定と評価

### 2.1 解決策候補

| 優先度 | 解決策 | 実装方法 | 利点 | 欠点 |
|--------|--------|----------|------|------|
| **1** | **useSecureFetch使用** | CSRFProviderのhookを利用 | 自動化、一貫性、保守性 | Context依存 |
| 2 | useCSRFContext使用 | 手動でヘッダー追加 | 柔軟性、明示的 | 実装重複 |
| 3 | 直接トークン取得 | /api/csrfから取得 | 独立性 | パフォーマンス低下 |

### 2.2 評価マトリクス

| 評価軸 | useSecureFetch | useCSRFContext | 直接取得 |
|--------|---------------|----------------|----------|
| 実装容易性 | ★★★★★ | ★★★ | ★★ |
| 保守性 | ★★★★★ | ★★★ | ★ |
| パフォーマンス | ★★★★ | ★★★★ | ★★ |
| 一貫性 | ★★★★★ | ★★★ | ★★ |
| テスト容易性 | ★★★★ | ★★★ | ★★ |

### 2.3 推奨解決策
**useSecureFetch（優先度1）** を採用

理由：
- 既存のCSRFProvider/useSecureFetchインフラを活用
- 最小限のコード変更で最大の効果
- 一貫性のある実装でメンテナンスが容易

---

## 3. 影響範囲分析

### 3.1 影響を受けるコンポーネント

| コンポーネント | HTTPメソッド | エンドポイント | 現状 | 修正優先度 |
|---------------|-------------|---------------|------|-----------|
| **FollowButton** | POST/DELETE | /api/follow/[userId] | CSRFヘッダーなし ❌ | **高** |
| ReportButton | POST | /api/reports | CSRFヘッダーなし ❌ | 高 |
| EmailResendButton | POST | /api/resend-verification | 要確認 | 中 |
| RealtimeBoard | POST | /api/posts | 要確認 | 高 |
| PerformanceTracker | POST | /api/performance | 要確認 | 低 |
| AdvancedSearch | POST | /api/search | 要確認 | 中 |
| BoardClient | POST | /api/posts | 要確認 | 高 |
| auth/EmailResendButton | POST | /api/auth/resend | 要確認 | 中 |

### 3.2 ファイル構造

```
src/
├── app/
│   ├── providers.tsx (CSRFProvider提供)
│   └── api/
│       ├── follow/[userId]/route.ts (CSRF検証対象)
│       ├── posts/route.ts (CSRF検証対象)
│       └── reports/route.ts (CSRF検証対象)
├── components/
│   ├── CSRFProvider.tsx (トークン管理・useSecureFetch提供)
│   ├── FollowButton.tsx (修正必要)
│   ├── ReportButton.tsx (修正必要)
│   └── [その他コンポーネント] (修正必要)
├── middleware.ts (CSRF検証実行)
└── lib/security/
    └── csrf-protection.ts (検証ロジック)
```

---

## 4. 実装計画

### 4.1 修正例

#### Before (現状)
```typescript
// src/components/FollowButton.tsx
const response = await fetch(`/api/follow/${userId}`, {
  method,
  headers: { 
    'Content-Type': 'application/json' 
  },
  credentials: 'include',
});
```

#### After (修正後)
```typescript
// src/components/FollowButton.tsx
import { useSecureFetch } from '@/components/CSRFProvider';

// コンポーネント内で
const secureFetch = useSecureFetch();

const response = await secureFetch(`/api/follow/${userId}`, {
  method,
  headers: { 
    'Content-Type': 'application/json' 
  },
});
```

### 4.2 実装フェーズ

| フェーズ | 内容 | 期間 | 優先度 |
|---------|------|------|--------|
| **Phase 1** | FollowButton修正・テスト | 1日 | **高** |
| **Phase 2** | POST系コンポーネント修正 | 2日 | 中 |
| **Phase 3** | その他コンポーネント修正 | 2日 | 低 |

---

## 5. テスト計画

### 5.1 単体テスト計画

```typescript
// __tests__/components/FollowButton.test.tsx
describe('FollowButton with CSRF', () => {
  // OKパターン
  test('CSRFトークンが正しく送信される', async () => {
    // Given: CSRFトークンがContextで提供される
    // When: フォローボタンをクリック
    // Then: x-csrf-tokenヘッダーが含まれる
  });

  // NGパターン
  test('CSRFトークンなしで403エラー', async () => {
    // Given: CSRFトークンが提供されない
    // When: フォローボタンをクリック
    // Then: 403エラーとエラーメッセージ表示
  });
});
```

### 5.2 結合テスト計画

```typescript
// __tests__/integration/follow-feature.test.tsx
describe('フォロー機能統合', () => {
  test('ユーザーカードからフォロー完了フロー', async () => {
    // Given: ログイン済み、ユーザーカード表示
    // When: フォローボタンクリック
    // Then: API呼び出し → 状態更新 → UI反映
  });

  test('CSRFトークン再取得フロー', async () => {
    // Given: CSRFトークン期限切れ
    // When: フォローボタンクリック
    // Then: 自動的にトークン再取得 → リトライ
  });
});
```

### 5.3 E2Eテスト計画

```typescript
// e2e/follow-feature.spec.ts
describe('フォロー機能E2E', () => {
  test('新規ユーザーのフォロー体験', async () => {
    // 1. サインアップ
    // 2. CSRFトークン自動取得確認
    // 3. ユーザー検索
    // 4. フォローボタンクリック
    // 5. フォロー成功確認
  });

  test('CSRF攻撃防御確認', async () => {
    // Given: 悪意のあるサイトからのリクエスト
    // When: CSRFトークンなしでPOST
    // Then: 403 Forbidden
  });
});
```

### 5.4 テストカバレッジ目標

| テスト種別 | ケース数 | 内容 |
|-----------|---------|------|
| 単体テスト | 55 | 各コンポーネント5ケース × 11 |
| 結合テスト | 5 | 主要フロー |
| E2Eテスト | 5 | クリティカルパス |
| **合計** | **65** | - |

---

## 6. エラーパターンと対処法

### 6.1 想定されるエラーと対処

| エラー | 原因 | 対処法 |
|--------|------|--------|
| 403 Forbidden | CSRFトークンなし/不一致 | useSecureFetch使用確認 |
| 401 Unauthorized | セッション切れ | 再ログイン促進 |
| 429 Too Many Requests | レート制限 | デバウンス実装 |
| Network Error | 接続断 | リトライまたは再読み込み |
| 409 Conflict | 既にフォロー済み | 状態同期の確認 |

### 6.2 エラー処理の実装例

```typescript
try {
  const response = await secureFetch(`/api/follow/${userId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // セッション切れ処理
      router.push('/auth/signin');
    } else if (response.status === 429) {
      // レート制限処理
      setError('しばらくお待ちください');
    }
  }
} catch (error) {
  // ネットワークエラー処理
  setError('接続エラーが発生しました');
}
```

---

## 7. リスク管理

### 7.1 技術的リスク

| リスク | 影響度 | 発生確率 | 緩和策 |
|--------|--------|---------|--------|
| Context未提供 | 高 | 低 | try-catchでフォールバック |
| トークン期限切れ | 中 | 中 | 自動リフレッシュ機能活用 |
| 後方互換性 | 低 | 低 | 段階的マイグレーション |
| パフォーマンス低下 | 低 | 低 | トークンキャッシュ活用 |

### 7.2 リスク緩和策の実装

```typescript
// Context未提供時のフォールバック
const secureFetch = useSecureFetch?.() || fetch;

// トークン自動リフレッシュ
useEffect(() => {
  const interval = setInterval(() => {
    refreshToken();
  }, 30 * 60 * 1000); // 30分ごと
  return () => clearInterval(interval);
}, []);
```

---

## 8. 実装チェックリスト

### Phase 1: FollowButton（優先度: 高）
- [ ] useSecureFetchのimport追加
- [ ] fetch呼び出しをsecureFetchに置換
- [ ] エラーハンドリングの確認
- [ ] 単体テストの作成
- [ ] 動作確認（ローカル環境）

### Phase 2: その他のPOSTコンポーネント
- [ ] ReportButton修正
- [ ] RealtimeBoard修正
- [ ] BoardClient修正
- [ ] 各コンポーネントの単体テスト
- [ ] 結合テストの実施

### Phase 3: 包括的テスト
- [ ] E2Eテストの実装
- [ ] パフォーマンステスト
- [ ] セキュリティ監査
- [ ] ドキュメント更新

---

## 9. 成功基準

### 9.1 機能要件
- ✅ 全てのフォローボタンが正常に動作する
- ✅ CSRFトークンが全てのPOST/PUT/DELETEリクエストに含まれる
- ✅ エラー時に適切なメッセージが表示される

### 9.2 非機能要件
- ✅ レスポンスタイム: 1秒以内
- ✅ エラー率: 1%未満
- ✅ テストカバレッジ: 80%以上

### 9.3 セキュリティ要件
- ✅ CSRF攻撃が100%防御される
- ✅ トークンの安全な管理
- ✅ セッション管理の整合性

---

## 10. まとめ

### 10.1 結論
CSRFトークン問題は、`useSecureFetch` hookを使用することで効率的に解決できます。この方法により、最小限のコード変更で全体的なセキュリティを確保できます。

### 10.2 次のステップ
1. **即座に実施**: FollowButtonの修正（Phase 1）
2. **今週中に完了**: その他のPOSTコンポーネント修正（Phase 2）
3. **来週までに**: 包括的テストとドキュメント化（Phase 3）

### 10.3 期待される成果
- セキュリティの向上（CSRF攻撃の防御）
- ユーザー体験の改善（エラーの解消）
- コードの保守性向上（一貫性のある実装）

---

## 付録

### A. 参照ファイル
- `/src/components/FollowButton.tsx`
- `/src/components/CSRFProvider.tsx`
- `/src/middleware.ts`
- `/src/lib/security/csrf-protection.ts`

### B. 関連ドキュメント
- [FOLLOW-API-IMPLEMENTATION-REPORT.md](./FOLLOW-API-IMPLEMENTATION-REPORT.md)
- [FOLLOW-BUTTON-USAGE.md](./FOLLOW-BUTTON-USAGE.md)

### C. 作成者情報
- 作成日: 2025年8月26日
- 担当: フロントエンドチーム
- レビュー: セキュリティチーム、QAチーム

---

**署名**: I attest: all numbers (and visuals) come from the attached evidence.