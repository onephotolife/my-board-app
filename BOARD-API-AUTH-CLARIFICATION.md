# Board API認証要件明確化文書

**作成日**: 2025年8月29日 12:30 JST  
**文書バージョン**: 1.0.0  
**STRICT120準拠**: 仕様不可侵原則

## 重要：仕様確認結果

### ❌ 誤った対応案（レポートに記載）
```
3. **Board API認証修正**
   - 公開エンドポイントとして認証スキップ実装
```

**この対応は会員制SNS掲示板の仕様に反するため、実施してはいけません。**

---

## 正しい仕様と実装状態

### 1. 会員制SNS掲示板の要求仕様

| 要求事項 | 内容 | 現在の実装 |
|---------|------|-----------|
| アクセス制御 | 会員のみ投稿閲覧可能 | ✅ 実装済み |
| 認証必須 | 全ての投稿操作に認証必要 | ✅ 実装済み |
| メール確認 | 確認済みユーザーのみ | ✅ 実装済み |

### 2. 現在のBoard API実装（/api/posts）

```typescript
// src/app/api/posts/route.ts:54-60
if (!token) {
  return createErrorResponse('認証が必要です', 401, 'UNAUTHORIZED');
}

if (!token.emailVerified) {
  return createErrorResponse('メールアドレスの確認が必要です', 403, 'EMAIL_NOT_VERIFIED');
}
```

**判定**: 仕様通り正しく実装されている

---

## 正しい対応方針

### 1. Board APIの認証は維持（変更不要）

- `/api/posts` は認証必須のまま維持
- 会員制SNS掲示板の根幹仕様のため変更禁止

### 2. テスト環境での対応

#### オプション1: テスト用ヘルスチェックエンドポイント追加
```typescript
// /api/health/route.ts（新規）
export async function GET() {
  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    public: true  // 公開エンドポイント
  });
}
```

#### オプション2: 認証付きテストの完全実装
```typescript
// テストヘルパーに認証セットアップ追加
beforeEach(async () => {
  // 1. ログイン実行
  const session = await login(AUTH_EMAIL, AUTH_PASSWORD);
  
  // 2. セッション保存
  await page.context().addCookies([{
    name: 'next-auth.session-token',
    value: session.token,
    domain: 'localhost',
    path: '/'
  }]);
  
  // 3. 認証済み状態でテスト実行
});
```

### 3. 影響範囲テストの修正

```javascript
// 正しいテスト期待値
describe('Board API Security', () => {
  test('認証なしアクセスは401を返す', async () => {
    const response = await fetch('/api/posts');
    expect(response.status).toBe(401); // ✅ 正しい
  });
  
  test('認証付きアクセスは200を返す', async () => {
    const response = await authenticatedFetch('/api/posts');
    expect(response.status).toBe(200); // ✅ 正しい
  });
});
```

---

## リスク評価

### Board APIを公開した場合のリスク

| リスク | 影響度 | 発生確率 | 対策 |
|--------|--------|---------|------|
| 非会員による投稿閲覧 | 致命的 | 確実 | 実施禁止 |
| プライバシー侵害 | 致命的 | 高 | 実施禁止 |
| 規約違反 | 重大 | 確実 | 実施禁止 |
| 信頼性喪失 | 重大 | 高 | 実施禁止 |

---

## 結論

1. **Board API（/api/posts）の認証は絶対に外さない**
2. 現在の実装は仕様通り正しい
3. テストは認証付きで実行する必要がある
4. 公開エンドポイントが必要な場合は別途作成する

---

## 推奨アクション

1. ✅ Board APIの認証維持（変更なし）
2. ⏳ NextAuth設定のJWTモード検討
3. ⏳ テスト用認証ヘルパーの強化
4. ❌ Board APIの認証スキップ（実施禁止）

---

**署名**: 仕様不可侵原則に基づき、Board APIの認証要件を維持します。

**作成者**: QA Automation (SUPER 500%)  
**レビュー者**: GOV-TRUST, SEC  
**承認**: 仕様変更なし

---

END OF DOCUMENT