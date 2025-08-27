# フォロー機能「ユーザーが見つかりません」エラーの根本原因分析レポート

## エグゼクティブサマリー

**問題**: test-followページでフォローボタンをクリックすると「ユーザーが見つかりません」というエラーが表示される

**報告されたエラー**:
- POST /api/follow/507f1f77bcf86cd799439004 → 500 Internal Server Error
- DELETE /api/follow/507f1f77bcf86cd799439002 → 400 Bad Request

**根本原因**: MongoDBトランザクション処理の失敗（レプリカセット未設定）

## 1. 現状の詳細分析

### 1.1 報告された症状

ユーザー（one.photolife+111@gmail.com）がログインした状態で：

1. test-followページを開く
2. フォローボタンをクリック
3. エラーメッセージ「ユーザーが見つかりません」が表示される
4. コンソールに500エラーと400エラー

### 1.2 データベース検証結果

すべてのユーザーはデータベースに存在：
- セッションユーザー: one.photolife+111@gmail.com ✓
- テストユーザー1-11: すべて存在 ✓

### 1.3 APIエンドポイントの処理フロー

`/api/follow/[userId]/route.ts`:

**POSTリクエスト（フォロー）**:
1. セッション確認 → なければ401
2. 現在のユーザー取得 → なければ404
3. ターゲットユーザー取得 → なければ404
4. トランザクション開始 → **ここで失敗（500エラー）**

## 2. 根本原因

### 最重要: MongoDBトランザクション失敗

**エラー発生箇所**: `/api/follow/[userId]/route.ts` 行92
```typescript
const session_db = await User.startSession();
```

**エラー内容**: 
```
MongoServerError: Transaction numbers are only allowed on a replica set member or mongos
```

**原因**: 
開発環境のMongoDBがスタンドアロンモードで動作しており、トランザクションをサポートしていない

## 3. 推奨される修正（即時対応）

### Option 1: トランザクションの条件付き実行

```typescript
// /api/follow/[userId]/route.ts

const useTransaction = process.env.MONGODB_USE_TRANSACTION === 'true';

if (useTransaction) {
  // レプリカセット環境：トランザクション使用
  const session_db = await User.startSession();
  // ...
} else {
  // スタンドアロン環境：トランザクションなし
  await Follow.create({
    follower: currentUser._id,
    following: targetUser._id,
    isReciprocal: false
  });
  
  await User.findByIdAndUpdate(
    currentUser._id,
    { $inc: { followingCount: 1 } }
  );
  // ...
}
```

### Option 2: try-catchでトランザクションをフォールバック

```typescript
let session_db = null;
try {
  session_db = await User.startSession();
  await session_db.withTransaction(async () => {
    // トランザクション処理
  });
} catch (error) {
  if (error.message?.includes('replica set')) {
    // トランザクションなしで実行
    await Follow.create({...});
    // ...
  } else {
    throw error;
  }
} finally {
  if (session_db) {
    await session_db.endSession();
  }
}
```

## 4. テストによる検証

### 4.1 現状確認
```bash
# MongoDBレプリカセット状態確認
mongosh --eval "db.adminCommand({ replSetGetStatus: 1 })"
# 結果: エラー（レプリカセット未設定）
```

### 4.2 修正後の期待結果
- フォロー機能が正常に動作
- エラーメッセージが表示されない
- データベースのカウントが正しく更新される

## 5. 結論と次のステップ

**結論**: MongoDBトランザクションの失敗が根本原因

**推奨アクション**:
1. **即時**: トランザクションを条件付きで実行するように修正
2. **短期**: 開発環境の.env.localに`MONGODB_USE_TRANSACTION=false`を追加
3. **中期**: 本番環境ではレプリカセットを使用

---
**作成日**: 2025-08-27  
**検証環境**: MongoDB スタンドアロン / Next.js 15
