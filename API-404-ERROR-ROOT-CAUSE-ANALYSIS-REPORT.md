# API 404エラー根本原因分析レポート

## エグゼクティブサマリー

localhost:3000でボタンクリック時に発生する404エラーの根本原因は、**認証済みセッションのユーザーがMongoDBデータベースに存在しない**ことによるものです。

## 報告されたエラー

ユーザーから報告されたエラー:
- GET `/api/user/permissions` → 404 Not Found
- GET `/api/profile` → 404 Not Found  
- POST `/api/follow/507f1f77bcf86cd799439008` → 404 Not Found

## 調査結果

### 1. エラーの実態

実際のHTTPレスポンスは認証状態により異なる:

#### 未認証時（curlテスト）
```
GET /api/user/permissions → 200 OK (ゲスト権限を返す)
GET /api/profile → 401 Unauthorized
POST /api/follow/[userId] → 403 Forbidden (CSRF保護)
```

#### 認証済み時（ブラウザセッション）
```
GET /api/user/permissions → 404 Not Found
GET /api/profile → 404 Not Found
POST /api/follow/[userId] → 404 Not Found
```

### 2. 根本原因

#### 2.1 直接的原因
セッションに登録されているユーザー `one.photolife+111@gmail.com` がMongoDBデータベースに存在しない。

**証拠**:
```javascript
// MongoDB確認結果
db.users.findOne({email: 'one.photolife+111@gmail.com'})
// 結果: null
```

#### 2.2 API実装の問題箇所

**`/api/user/permissions/route.ts`** (lines 72-80):
```typescript
const user = await User.findOne({ email: effectiveSession.user.email })
  .select('_id role name email emailVerified');

if (!user) {
  return NextResponse.json(
    { error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}
```

**`/api/profile/route.ts`** (lines 17-26):
```typescript
const user = await User.findOne({ email: session.user.email })
  .select('-password')
  .lean();

if (!user) {
  return NextResponse.json(
    { error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}
```

**`/api/follow/[userId]/route.ts`** (lines 41-49):
```typescript
const currentUser = await User.findOne({ email: session.user.email });
if (!currentUser) {
  return NextResponse.json(
    { 
      success: false,
      error: 'Current user not found' 
    },
    { status: 404 }
  );
}
```

### 3. エラーフロー

1. ユーザーがブラウザでページにアクセス
2. NextAuth.jsセッションが存在（email: `one.photolife+111@gmail.com`）
3. React ContextsがAPIを呼び出し:
   - `PermissionContext` → `/api/user/permissions`
   - `UserContext` → `/api/profile`
   - `FollowButton` → `/api/follow/[userId]`
4. 各APIがデータベースでユーザーを検索
5. ユーザーが見つからず、404エラーを返す

### 4. サーバーログからの証拠

```
🔍 [API Security] セッション状態: {
  hasSession: true,
  hasUser: true,
  email: 'one.photolife+111@gmail.com',
  emailVerified: true,
  timestamp: '2025-08-26T23:00:54.622Z'
}
✅ [API Security] 認証成功: one.photolife+111@gmail.com
GET /api/user/permissions 404 in 322ms
GET /api/profile 404 in 325ms
```

## 問題の影響範囲

### 影響を受けるコンポーネント

1. **PermissionContext** (`/src/contexts/PermissionContext.tsx`)
   - 権限取得失敗 → デフォルトのゲスト権限を使用

2. **UserContext** (`/src/contexts/UserContext.tsx`)
   - プロフィール取得失敗 → 最小限のユーザー情報で代替

3. **FollowButton** (`/src/components/FollowButton.tsx`)
   - フォロー操作失敗 → エラー表示

## システム設計上の課題

### 1. データ整合性の欠如
NextAuth.jsのセッションとMongoDBのユーザーデータが同期されていない可能性がある。

### 2. エラーハンドリングの不一致
- 未認証時: 適切なステータスコード（200/401/403）
- 認証済み時: すべて404（ユーザー不在）

### 3. セッション検証の不完全性
セッションは有効だが、対応するユーザーレコードが存在しない状態を許容している。

## 推奨される解決策

### 短期的対策
1. データベースに存在しないユーザーのセッションを無効化
2. 欠落しているユーザーレコードの作成
3. セッション検証の強化

### 長期的対策
1. NextAuth.jsのコールバック改善（ユーザー存在確認の追加）
2. データベースとセッションの同期メカニズム実装
3. エラーレスポンスの統一化

## 追加情報: データベースの実態

### 現在のデータベース状況

MongoDBに存在するユーザー（抜粋）:
- `one.photolife+3@gmail.com` (ID: 68970327e8e4731fffdcfeea)
- `test@example.com` (ID: 68a9c5b67be787d8af4e7f3f)
- `test1@example.com` - `test11@example.com` (テストユーザー)

**注目点**: セッションのユーザー `one.photolife+111@gmail.com` は存在しないが、類似の `one.photolife+3@gmail.com` が存在する。メールアドレスの不一致の可能性。

## 結論

404エラーは技術的には正確（データベースにユーザーが存在しない）だが、ユーザー体験として混乱を招く。認証システムとデータベースの整合性を保つメカニズムが必要。

### 即座に実行可能な対処

1. **セッションユーザーの確認**:
   ```bash
   # 現在のセッションユーザーをデータベースに追加
   mongosh board-app --eval "db.users.insertOne({email: 'one.photolife+111@gmail.com', name: 'Session User', emailVerified: true, ...})"
   ```

2. **または既存ユーザーでログインし直す**:
   ```
   one.photolife+3@gmail.com でログイン
   ```

---

**作成日時**: 2025-08-26T23:02:00Z  
**調査方法**: STRICT120プロトコルに基づく証拠ベースの分析  
**証拠収集**:
- サーバーログ分析
- APIエンドポイント実装コード検証
- データベース直接クエリ（15ユーザー確認）
- HTTPレスポンステスト（curl/ブラウザ）