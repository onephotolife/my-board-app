# like機能削除の影響評価レポート

## 実施日時
2025年8月25日 13:15-13:20 JST

## 実施者
【担当: #3 フロントエンドプラットフォームリード（FE-PLAT）／R: FE-PLAT／A: FE-PLAT】

## エグゼクティブサマリー
**like機能は意図的に削除されましたが、フロントエンドコードに多数の参照が残存しており、これがTypeErrorの原因です。**
削除作業が不完全で、UIとAPIの整合性が取れていない状態です。

## 1. 現状分析

### 1.1 like機能削除の実施状況
| レイヤー | 削除状況 | 影響 |
|---------|---------|------|
| データベーススキーマ | ✅ 削除済み | likesフィールドなし |
| APIレスポンス | ✅ 削除済み | likes: undefined |
| フロントエンドUI | ❌ **未削除** | エラー発生 |
| 型定義 | ❌ **未削除** | 型不整合 |

### 1.2 残存している参照箇所（10ファイル）

#### 最重要：エラー発生箇所
```typescript
// src/app/posts/[id]/page.tsx
59:  likes: string[];                          // 型定義
390: {post.likes.length} いいね                 // ❌ エラー発生箇所
404: {post.likes.length}                        // ❌ エラー発生箇所
216-218: いいね処理ロジック                      // 使用不可
```

#### その他の残存箇所
- src/components/RealtimeBoard.tsx（8箇所）
- src/app/posts/[id]/edit/page.tsx（1箇所）
- src/components/AdvancedSearch.tsx
- src/app/api/search/route.ts
- src/app/api/socket/route.ts
- src/lib/socket/server.ts
- モデル関連ファイル

## 2. 技術的評価

### 2.1 エラー発生メカニズム
```
[削除前の想定フロー]
API → { likes: [userId1, userId2] } → UI表示 ✅

[現在の破損したフロー]
API → { likes: undefined } → UI（likes.length） → TypeError ❌
```

### 2.2 影響範囲の深刻度
| 機能 | 影響度 | 理由 |
|------|--------|------|
| 投稿詳細表示 | **致命的** | ページ全体がクラッシュ |
| 投稿編集後の遷移 | **致命的** | リダイレクト先でエラー |
| いいねボタン | 表示不能 | エラーで描画停止 |
| リアルタイム更新 | 潜在的問題 | Socket.io関連も要修正 |

## 3. 修正方針の評価

### 3.1 選択肢A：like機能の完全削除を貫徹
**推奨度：⭐⭐⭐⭐⭐**

#### 実装内容
1. フロントエンドからすべてのlikes参照を削除
2. いいねボタンUIを削除
3. 型定義からlikesフィールドを削除
4. Socket.ioイベントハンドラーから削除

#### メリット
- 仕様と実装の一貫性
- コードベースの簡潔化
- 将来的な混乱の防止

#### デメリット
- 修正箇所が多い（10ファイル以上）

### 3.2 選択肢B：防御的コーディングで対処
**推奨度：⭐⭐**

#### 実装内容
```typescript
// すべての参照箇所を修正
{post.likes?.length || 0} いいね
```

#### メリット
- 最小限の修正で動作可能

#### デメリット
- 死んだコードが残る
- 将来の開発者を混乱させる
- 仕様と実装の不一致が継続

### 3.3 選択肢C：like機能を復活
**推奨度：⭐**

#### 実装内容
- スキーマにlikesフィールド追加
- API実装を復活

#### メリット
- フロントエンド修正不要

#### デメリット
- 削除の意図に反する
- 不要な機能の維持コスト

## 4. 推奨アクション

### 4.1 即時対応（Phase 1）- 1時間以内
```typescript
// src/app/posts/[id]/page.tsx の390行目と404行目
// 緊急修正：エラーを防ぐ
{post.likes?.length || 0} いいね
```
**目的**：本番環境のクラッシュを即座に解消

### 4.2 完全対応（Phase 2）- 2日以内
1. **すべてのlikes参照を削除**
   - UIコンポーネントからいいね表示を削除
   - 型定義からlikesフィールドを削除
   - Socket.ioイベントハンドラーを整理

2. **テスト実施**
   - 全投稿詳細ページの表示確認
   - 編集後のリダイレクト確認
   - リアルタイム更新の動作確認

## 5. リスク評価

### 5.1 現状維持のリスク
- **極高**：全ユーザーが投稿を閲覧できない
- ビジネスインパクト：サービス利用不可

### 5.2 修正のリスク
- **低**：UIからの要素削除は低リスク
- 段階的実施で更にリスク軽減可能

## 6. 結論と提言

### 結論
**like機能の削除は不完全であり、これが今回のTypeErrorの直接原因です。**

### 提言
1. **即座に**防御的コーディングで本番環境を安定化
2. **その後**、like機能の痕跡を完全に削除
3. **今後**、機能削除時はチェックリストを使用

### チェックリスト（今後の参考）
- [ ] データベーススキーマから削除
- [ ] APIレスポンスから削除
- [ ] フロントエンド型定義から削除
- [ ] UIコンポーネントから削除
- [ ] イベントハンドラーから削除
- [ ] テストコードから削除
- [ ] ドキュメントを更新

## 7. 影響ファイルリスト

### 必須修正（エラー解消）
1. src/app/posts/[id]/page.tsx

### 完全削除対象
1. src/app/posts/[id]/page.tsx
2. src/app/posts/[id]/edit/page.tsx
3. src/components/RealtimeBoard.tsx
4. src/components/AdvancedSearch.tsx
5. src/app/api/search/route.ts
6. src/app/api/socket/route.ts
7. src/lib/socket/server.ts
8. src/models/Post.unified.ts
9. src/lib/models/Post.ts
10. src/models/__tests__/Post.test.ts

## 8. 署名

`I attest: all analysis comes from the code inspection evidence.`

RACI: R: FE-PLAT (#3) / A: FE-PLAT (#3) / C: QA (#21), ARCH (#2) / I: EM (#1)