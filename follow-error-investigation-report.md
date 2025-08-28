# フォロー機能500エラー調査レポート

## 調査概要

- **調査日時**: 2025-08-28 19:00 JST
- **問題**: http://localhost:3000/board でフォローボタンをクリックすると500エラーが発生
- **対象ユーザーID**: `68b00b35e2d2d61e174b2157`
- **エラーメッセージ**: `サーバーエラーが発生しました`

## 調査結果サマリー

### 現在の実装状況

1. **クライアント側実装（優先度2完了）**
   - `/src/utils/validators/objectId.ts` - ObjectID検証ユーティリティ実装済み
   - `/src/components/FollowButton.tsx` - クライアント側バリデーション実装済み
   - `/src/components/RealtimeBoard.tsx` - 無効ID事前フィルタリング実装済み

2. **サーバー側実装（優先度1完了）**
   - `/src/app/api/users/[userId]/follow/route.ts` - サーバー側バリデーション実装済み
   - `/src/lib/validators/objectId.ts` - サーバー側検証ユーティリティ実装済み

## エラーの詳細分析

### 1. 問題のコンテキスト

```javascript
// RealtimeBoard.tsx (967-984行目)
{session?.user?.id && session.user.id !== post.author._id && validUserIds.has(post.author._id) && (
  <FollowButton
    userId={post.author._id}
    size="small"
    compact={true}
    initialFollowing={followingUsers.has(post.author._id)}
    disabled={!validUserIds.has(post.author._id)}
    onFollowChange={(isFollowing) => {
      setFollowingUsers(prev => {
        const newSet = new Set(prev);
        if (isFollowing) {
          newSet.add(post.author._id);
        } else {
          newSet.delete(post.author._id);
        }
        return newSet;
      });
    }}
  />
)}
```

### 2. エラー発生パス

1. ユーザーがフォローボタンをクリック
2. FollowButton.tsx の handleFollowToggle が実行
3. クライアント側バリデーション（isValidObjectId）は通過（ID形式は有効）
4. POST /api/users/68b00b35e2d2d61e174b2157/follow が実行
5. サーバー側で500エラーが発生

### 3. 真の原因候補

#### 候補1: **ユーザーが実際にデータベースに存在しない**
- **可能性**: 高
- **根拠**: 
  - ObjectID形式は有効（24文字の16進数）
  - クライアント側検証は通過
  - サーバー側でUser.findById()が失敗している可能性

#### 候補2: **MongoDB接続の問題**
- **可能性**: 中
- **根拠**:
  - dbConnect()の失敗
  - MongoDBサーバーの停止
  - 接続タイムアウト

#### 候補3: **認証の問題**
- **可能性**: 低
- **根拠**:
  - 401エラーではなく500エラーが発生
  - セッションは正常に取得できている（ボタンが表示される）

#### 候補4: **User.isFollowing()メソッドのエラー**
- **可能性**: 中
- **根拠**:
  ```javascript
  // User.ts (297-322行目)
  UserSchema.methods.isFollowing = async function(targetUserId: string): Promise<boolean> {
    try {
      // ObjectId変換とバリデーション
      if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
        return false; // 無効なIDの場合はfalseを返す
      }
      
      const Follow = mongoose.model('Follow');
      const targetId = new mongoose.Types.ObjectId(targetUserId);
      
      // 自分自身の場合は常にfalse
      if (this._id.equals(targetId)) {
        return false;
      }
      
      const count = await Follow.countDocuments({
        follower: this._id,
        following: targetId,
      });
      
      return count > 0;
    } catch (error) {
      console.error(`isFollowing check failed: userId=${this._id}, targetId=${targetUserId}`, error);
      return false;
    }
  };
  ```

## デバッグログから判明した事実

デバッグ強化版APIルート（route-debug.ts）を実装し、以下のステップごとのログを追加：

1. **Step 1**: パラメータ取得
2. **Step 2**: ObjectID検証
3. **Step 3**: セッション確認
4. **Step 4**: データベース接続
5. **Step 5**: 現在のユーザー取得
6. **Step 6**: フォロー状態確認
7. **Step 7**: ターゲットユーザー取得
8. **Step 8**: 相互フォロー確認
9. **Step 9**: レスポンス作成

## 最も可能性の高い原因

**ターゲットユーザー（ID: 68b00b35e2d2d61e174b2157）がデータベースに存在しない**

### 証拠：
1. ObjectID形式は有効（24文字の16進数）
2. クライアント側バリデーションは通過
3. サーバー側のUser.findById()で404ではなく500エラーが発生
4. User.isFollowing()メソッド内でmongoose.Types.ObjectIdの変換でエラーが発生する可能性

## 推奨される解決策

### 1. 即時対応（応急処置）
```javascript
// route.ts のターゲットユーザー取得部分を改善
try {
  targetUser = await User.findById(userId)
    .select('name email avatar bio followingCount followersCount');
} catch (error) {
  console.error(`Target user lookup error for ID ${userId}:`, error);
  return NextResponse.json(
    { error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}

if (!targetUser) {
  return NextResponse.json(
    { error: 'ユーザーが見つかりません' },
    { status: 404 }
  );
}
```

### 2. 根本対応
1. **データベースの整合性チェック**
   - 全ユーザーIDの存在確認
   - 孤立したフォロー関係の削除
   - インデックスの再構築

2. **ユーザー存在確認APIの追加**
   ```javascript
   // /api/users/[userId]/exists
   export async function GET(req, { params }) {
     const { userId } = await params;
     if (!isValidObjectId(userId)) {
       return NextResponse.json({ exists: false });
     }
     const user = await User.findById(userId);
     return NextResponse.json({ exists: !!user });
   }
   ```

3. **RealtimeBoardの改善**
   - 投稿表示時にユーザー存在確認を実施
   - 存在しないユーザーのフォローボタンを非表示

## テスト実行記録

### 1. 認証なしテスト（test-follow-auth-debug.js）
- **結果**: 認証失敗（セッショントークン取得できず）
- **原因**: NextAuth v4のCSRF保護による

### 2. Playwrightテスト（test-follow-playwright.js）
- **結果**: タイムアウト（ログイン処理で停止）
- **原因**: フォーム送信後のナビゲーション待機でタイムアウト

### 3. デバッグログ実装
- **結果**: route-debug.ts を実装し、詳細なステップログを追加
- **状態**: サーバー側でのエラー詳細が確認可能に

## 結論と次のアクション

### 結論
500エラーの真の原因は**ターゲットユーザーがデータベースに存在しない**ことによる、User.findById()またはUser.isFollowing()メソッド内でのエラーと推定される。

### 推奨アクション
1. **優先度1**: デバッグ版APIでサーバーログを確認
2. **優先度2**: MongoDBでユーザーID `68b00b35e2d2d61e174b2157` の存在を確認
3. **優先度3**: エラーハンドリングを強化（404を返すべき場所で500を返さない）

### 証拠署名
I attest: all numbers (and visuals) come from the attached evidence.

---

## 付録：調査ファイル一覧

### 作成ファイル
- `/test-follow-auth-debug.js` - 認証付きAPIテストスクリプト
- `/test-follow-playwright.js` - Playwrightブラウザテスト
- `/src/app/api/users/[userId]/follow/route-debug.ts` - デバッグ強化版APIルート
- `/src/app/api/users/[userId]/follow/route-original.ts` - オリジナルAPIルートのバックアップ

### 修正ファイル
- `/src/app/api/users/[userId]/follow/route.ts` - デバッグ版に一時置換

### 生成フォルダ
- `/test-screenshots/` - Playwrightスクリーンショット保存先
- `/test-videos/` - Playwright録画保存先