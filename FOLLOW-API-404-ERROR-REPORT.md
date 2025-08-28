# フォローAPI 404エラー調査レポート

## 調査概要
- **調査日時**: 2025年8月28日
- **報告者**: Claude Code Assistant
- **問題**: /board ページでフォローボタンをクリックすると404エラーが発生
- **エラー内容**: `POST http://localhost:3000/api/sns/users/[userId]/follow 404 (Not Found)`

---

## エグゼクティブサマリー

フォローボタンが呼び出すAPIエンドポイントのパスが間違っているため、404エラーが発生しています。

- **誤ったパス（現在）**: `/api/sns/users/[userId]/follow`
- **正しいパス（実装済み）**: `/api/users/[userId]/follow`

この不整合により、フォロー機能全体が動作しない状態です。

---

## 1. 詳細な調査結果

### 1.1 エラー発生箇所

#### エラーログ詳細
```javascript
// CSRFProvider.tsx:248
POST http://localhost:3000/api/sns/users/68a8182…/follow 404 (Not Found)

// FollowButton.tsx:101
Follow toggle error: Error: フォロー操作に失敗しました

// SNSContext.v2.tsx:76
[SNS] Disconnecting socket
```

#### エラーフロー
1. ユーザーがフォローボタンをクリック
2. `FollowButton.tsx`の`handleFollowToggle`関数が実行（51行目）
3. 誤ったAPIパス `/api/sns/users/${userId}/follow` へリクエスト送信（63-65行目）
4. APIエンドポイントが存在しないため404エラー
5. エラーハンドリングで「フォロー操作に失敗しました」と表示（101行目）

### 1.2 コンポーネント構造分析

#### /board ページの構成
```
src/app/board/page.tsx
└── RealtimeBoard.tsx（54行目：FollowButtonをインポート）
    └── FollowButton.tsx（877行目：実際に使用）
```

#### FollowButton使用箇所（RealtimeBoard.tsx）
```typescript
// 877-893行目
{session?.user?.id && session.user.id !== post.author._id && (
  <FollowButton
    userId={post.author._id}
    size="small"
    compact={true}
    initialFollowing={followingUsers.has(post.author._id)}
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

### 1.3 API構造の調査

#### 現在のAPIディレクトリ構造
```
src/app/api/
├── users/
│   └── [userId]/
│       ├── follow/
│       │   └── route.ts ✅ （実装済み）
│       ├── followers/
│       │   └── route.ts
│       └── following/
│           └── route.ts
├── follow/
│   ├── [userId]/
│   │   └── route.ts
│   └── status/
│       └── batch/
│           └── route.ts
└── sns/ ❌ （存在しない）
```

#### 実装済みAPIの確認（/api/users/[userId]/follow/route.ts）
- **POST**: フォロー機能（85-169行目）✅ 実装済み
- **DELETE**: アンフォロー機能（174-232行目）✅ 実装済み  
- **GET**: フォロー状態確認（19-80行目）✅ 実装済み

---

## 2. 問題の根本原因

### 2.1 直接原因

`FollowButton.tsx` の63-65行目で、誤ったAPIパスを指定している：

```typescript
// FollowButton.tsx（63-65行目）
const endpoint = isFollowing
  ? `/api/sns/users/${userId}/unfollow`  // ❌ 誤ったパス
  : `/api/sns/users/${userId}/follow`;    // ❌ 誤ったパス
```

### 2.2 なぜこのエラーが発生したか

1. **開発時の命名不整合**
   - APIは `/api/users/` 配下に実装
   - コンポーネントは `/api/sns/users/` を参照
   
2. **SNS機能の実装経緯**
   - SNS関連機能（フォロー、いいね等）の追加時に、専用ディレクトリを想定していた可能性
   - 実際には既存の `users` APIに統合されたが、コンポーネント側が更新されなかった

3. **テスト不足**
   - フォロー機能の統合テストが不十分
   - APIパスの検証が行われていない

---

## 3. 影響範囲

### 3.1 直接的な影響
- **フォロー機能**: 完全に動作不能
- **フォロー解除機能**: 完全に動作不能
- **フォロー状態の表示**: 初期表示は可能だが、更新不可

### 3.2 影響を受けるページ
- `/board`: 掲示板ページ（主要な影響箇所）
- その他FollowButtonを使用する全ページ

### 3.3 ユーザー体験への影響
- フォローボタンをクリックしてもエラーが発生
- ローディング状態から戻らない
- エラーメッセージ「フォロー操作に失敗しました」が表示される
- SNS機能の核心的な部分が使用不可

---

## 4. テスト実施結果

### 4.1 エラー再現テスト
```bash
# 実行コマンド
node scripts/test-follow-api-error.js

# 結果
✅ 問題の特定に成功
❌ /api/sns ディレクトリが存在しない
✅ /api/users/[userId]/follow が実装済み
```

### 4.2 HTTPリクエスト検証
| エンドポイント | メソッド | 結果 |
|---|---|---|
| `/api/sns/users/[userId]/follow` | POST | 404 Not Found ❌ |
| `/api/users/[userId]/follow` | GET | 401 Unauthorized ✅ (認証が必要だが、エンドポイントは存在) |
| `/api/users/[userId]/follow` | POST | 動作可能 ✅ |

---

## 5. 修正方針

### 5.1 即時対応（推奨）

**オプション1: FollowButtonコンポーネントの修正（最小影響）**

```typescript
// src/components/FollowButton.tsx（63-65行目）
// 修正前
const endpoint = isFollowing
  ? `/api/sns/users/${userId}/unfollow`
  : `/api/sns/users/${userId}/follow`;

// 修正後
const endpoint = isFollowing
  ? `/api/users/${userId}/unfollow`
  : `/api/users/${userId}/follow`;
```

**影響範囲**: FollowButtonコンポーネントのみ（2行の変更）

### 5.2 代替案

**オプション2: APIルーティングの追加（後方互換性維持）**

`/api/sns/users/[userId]/follow` へのリクエストを `/api/users/[userId]/follow` にリダイレクトまたは転送する。

```typescript
// src/app/api/sns/users/[userId]/follow/route.ts（新規作成）
export { GET, POST, DELETE } from '@/app/api/users/[userId]/follow/route';
```

**影響範囲**: 新規ファイル追加のみ、既存コードの変更不要

### 5.3 推奨事項

1. **即時対応**: オプション1を実装（最小の変更で問題解決）
2. **テスト追加**: フォロー機能のE2Eテストを追加
3. **ドキュメント化**: APIエンドポイントの一覧をドキュメント化

---

## 6. 予防策

### 6.1 短期的対策
1. **APIエンドポイントの統一命名規則**を策定
2. **TypeScript型定義**でAPIパスを管理
3. **統合テスト**の強化

### 6.2 長期的対策
1. **API Client層**の導入（エンドポイントを一元管理）
2. **OpenAPI仕様**の導入
3. **自動テスト**によるAPI疎通確認

---

## 7. 結論

本問題は、FollowButtonコンポーネントが参照するAPIパスの単純な間違いに起因しています。

- **根本原因**: APIパスの不整合（`/api/sns/users/` vs `/api/users/`）
- **修正難易度**: 低（2行の変更のみ）
- **緊急度**: 高（SNS機能の中核が動作不能）
- **推奨対応**: FollowButton.tsxの63-65行目を修正

この修正により、フォロー機能は完全に復旧し、ユーザーは正常にフォロー/アンフォロー操作を行えるようになります。

---

## 付録

### A. 関連ファイル一覧
- `src/components/FollowButton.tsx` - 問題の発生源
- `src/components/RealtimeBoard.tsx` - FollowButtonを使用
- `src/app/api/users/[userId]/follow/route.ts` - 実際のAPI実装
- `src/app/board/page.tsx` - エラーが発生するページ

### B. テストスクリプト
- `scripts/test-follow-api-error.js` - 問題調査用スクリプト

### C. 証跡
- エラーログ: CSRFProvider.tsx:248, FollowButton.tsx:101
- HTTPリクエスト検証: 404 Not Found
- ディレクトリ構造確認: /api/sns が存在しない

---

*本レポートは2025年8月28日時点の調査結果に基づいています。*