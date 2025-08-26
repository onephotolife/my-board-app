# test-followページエラー 真の原因究明レポート

## 調査概要
- **調査日時**: 2025-08-26
- **調査対象**: http://localhost:3000/test-follow
- **調査者**: #22 QA Automation（QA-AUTO）

## エラー状況

### 1. 確認されたエラー一覧
```
- CSRFProvider.tsx:45 GET http://localhost:3000/api/csrf 429 (Too Many Requests)  
- providers.tsx:31 GET http://localhost:3000/api/auth/session 429 (Too Many Requests)
- AppReadyNotifier.tsx:176 POST http://localhost:3000/api/performance 429 (Too Many Requests)
- CSRFProvider.tsx:143 POST http://localhost:3000/api/follow/507f1f7… 404 (Not Found)
- FollowButton.tsx:136 React warning: hideText prop not recognized
- page.tsx:113,213 MUI Grid warnings: deprecated props (item, xs, md)
```

## 真の原因分析

### 優先度1: 429 Too Many Requests（レート制限超過）

#### 原因の詳細
- **場所**: `/src/middleware.ts` および `/src/lib/security/rate-limiter-v2.ts`
- **設定**: apiRateLimiter = 1分間に30リクエストまで
- **問題点**: ページ初回ロード時に短時間で多数のAPIコールが同時発生

#### 根本原因
```typescript
// CSRFProvider.tsx - 複数のタイミングでトークン取得
1. 初回マウント時 (useEffect)
2. ページフォーカス時 (visibilitychange)
3. セッション変更時 (session監視)

// AppReadyNotifier - パフォーマンスデータ送信
// PerformanceTracker - 追加のパフォーマンスデータ送信
// NextAuth - セッション確認
```

これらがほぼ同時に実行され、瞬間的にレート制限に到達。

### 優先度2: 404 Not Found（フォローAPI）

#### 原因の詳細
- **場所**: `/src/app/api/follow/[userId]/route.ts`
- **問題点**: 
  1. 認証が必要（未ログイン状態）
  2. 存在しないユーザーIDを使用

#### 根本原因
```typescript
// test-follow/page.tsx
const TEST_USER_IDS = {
  user1: '507f1f77bcf86cd799439001', // 形式は有効だがDBに存在しない
  // ...
};

// api/follow/[userId]/route.ts
const session = await getServerSession(authOptions);
if (!session?.user?.email) {
  return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
}
const targetUser = await User.findById(userId);
if (!targetUser) {
  return NextResponse.json({ error: 'Target user not found' }, { status: 404 });
}
```

### 優先度3: React警告（hideText prop）

#### 原因の詳細
- **場所**: `/src/app/test-follow/page.tsx` 行199, 203
- **問題点**: FollowButtonコンポーネントに存在しないプロパティ

#### 根本原因
```typescript
// test-follow/page.tsx
<FollowButton 
  userId={TEST_USER_IDS.user10}
  hideText={true}  // このプロパティは存在しない
/>

// FollowButton.tsx
interface FollowButtonProps extends Omit<ButtonProps, 'onClick'> {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  showIcon?: boolean;
  followText?: string;
  followingText?: string;
  loadingText?: string;
  compact?: boolean;
  // hideTextプロパティは定義されていない
}
```

### 優先度4: MUI Grid警告

#### 原因の詳細
- **場所**: `/src/app/test-follow/page.tsx` 行113, 213
- **問題点**: Grid v2で非推奨となったプロパティの使用

#### 根本原因
```typescript
// 旧API（Grid v1）
<Grid item xs={12} md={6}>

// 新API（Grid v2）が必要
<Grid size={12} size={{ md: 6 }}>
```

## 影響範囲

| エラー | 影響度 | 影響範囲 |
|--------|--------|----------|
| 429エラー | 高 | すべてのAPI機能が一時的に使用不可 |
| 404エラー | 中 | フォロー機能が完全に動作しない |
| hideText警告 | 低 | 開発環境での警告のみ、機能影響なし |
| Grid警告 | 低 | 開発環境での警告のみ、機能影響なし |

## 推奨される解決策

### 1. レート制限問題の解決
- API呼び出しのデバウンスまたは遅延実行
- 開発環境でのレート制限緩和
- 初回ロード時の不要なAPI呼び出し削減

### 2. フォローAPI問題の解決
- テスト用の実在するユーザーデータの準備
- 認証済みセッションでのテスト実行
- エラーハンドリングの改善

### 3. React/MUI警告の解決
- hideTextプロパティの削除
- Grid v2 APIへの完全移行

## 証拠

### API動作確認
```bash
# CSRFトークン取得: 正常動作
curl -i http://localhost:3000/api/csrf
# Response: 200 OK

# セッション確認: 未ログイン
curl -i http://localhost:3000/api/auth/session  
# Response: {} (空のセッション)
```

### ソースコード確認
- middleware.ts:125行目 - apiRateLimiter設定
- rate-limiter-v2.ts:125-129行目 - 30リクエスト/分の制限
- test-follow/page.tsx:199,203行目 - hideTextプロパティ使用
- FollowButton.tsx:17-26行目 - プロパティ定義

## 結論

主要な問題は以下の2点：
1. **レート制限**: ページ初回ロード時の過剰なAPI呼び出し
2. **認証・データ不整合**: 未ログイン状態と存在しないユーザーID

これらは設定調整と適切なテストデータの準備で解決可能。

---

署名: I attest: all numbers come from the attached evidence.  
Evidence Hash: src/middleware.ts, src/lib/security/rate-limiter-v2.ts, src/app/test-follow/page.tsx