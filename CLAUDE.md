# オープン掲示板アプリケーション

## プロジェクト概要
このプロジェクトは、Next.js 15とMaterial-UI（MUI）を使用したシンプルなオープン掲示板アプリケーションです。ユーザーは投稿の作成、編集、削除ができます。

## 技術スタック
- **フレームワーク**: Next.js 15.4.5（App Routerを使用）
- **言語**: TypeScript 5
- **UIライブラリ**: Material-UI (MUI) v7
- **データベース**: MongoDB（Mongooseを使用）
- **スタイリング**: Tailwind CSS v4、Emotion（MUI用）
- **開発ツール**: ESLint、Prettier、lint-staged、Turbopack

## プロジェクト構造
```
my-board-app/
├── src/
│   ├── app/
│   │   ├── api/          # APIルート
│   │   │   └── posts/    # 投稿用CRUD API
│   │   ├── layout.tsx    # ルートレイアウト
│   │   ├── page.tsx      # メインページ（掲示板UI）
│   │   └── providers.tsx # MUIテーマプロバイダー
│   ├── components/
│   │   ├── EditDialog.tsx # 投稿編集用ダイアログ
│   │   ├── PostForm.tsx   # 新規投稿フォーム
│   │   └── PostItem.tsx   # 個別投稿表示コンポーネント
│   ├── lib/
│   │   └── mongodb.ts     # MongoDB接続管理
│   ├── models/
│   │   └── Post.ts        # Mongooseスキーマ定義
│   └── types/
│       └── global.d.ts    # グローバル型定義
└── package.json
```

## 主要機能
1. **投稿の作成**: 200文字以内のテキスト投稿
2. **投稿の表示**: 時系列で投稿を表示（最新が上）
3. **投稿の編集**: 既存投稿の内容を編集
4. **投稿の削除**: 確認後に投稿を削除

## データモデル
### Postスキーマ
```typescript
{
  title: string (max: 100文字) - 必須
  content: string (max: 500文字) - 必須
  author: string (max: 50文字) - 必須
  createdAt: Date - 自動生成
  updatedAt: Date - 自動生成
}
```

注意: 現在のUIでは`content`フィールドのみ使用（200文字制限）。`title`と`author`は未実装。

## API エンドポイント
- `GET /api/posts` - 全投稿を取得（新しい順）
- `POST /api/posts` - 新規投稿作成
- `PUT /api/posts/[id]` - 投稿更新
- `DELETE /api/posts/[id]` - 投稿削除

## 開発コマンド
```bash
# 開発サーバー起動（Turbopack使用）
npm run dev

# ビルド
npm run build

# 本番サーバー起動
npm run start

# リント実行
npm run lint
npm run lint:fix

# フォーマット
npm run format
npm run format:check

# テスト
npm run test
npm run test:watch
npm run test:coverage

# 型チェック
npm run typecheck

# 全チェック実行
npm run check
```

## 品質管理

### Claude Codeで作業する際の品質チェック
作業完了時に以下のコマンドを実行してください：

```bash
# 簡易チェック（リントとフォーマット）
npm run lint && npm run format:check

# 完全チェック（リント、フォーマット、型チェック、テスト）
npm run check && npm run typecheck
```

### 自動チェック（git commit時）
- lint-stagedにより、コミット時に自動的にESLintとPrettierが実行されます
- エラーがある場合はコミットがブロックされます
- スキップする場合: `git commit --no-verify`

## 環境変数
- `MONGODB_URI`: MongoDB接続URI（デフォルト: `mongodb://localhost:27017/board-app`）

## 注意事項
1. **データモデルの不整合**: PostスキーマとUIコンポーネント間でフィールドの不一致あり
   - スキーマ: `title`, `content`, `author`フィールドが必須
   - UI: `content`フィールドのみ使用
   - APIは`title`と`author`なしでPOSTリクエストを受け付けるとバリデーションエラーになる可能性

2. **文字数制限の相違**:
   - UIフォーム: 200文字制限
   - データベーススキーマ: 500文字まで許可

3. **MongoDB接続**: 開発時はローカルのMongoDBインスタンスが必要

## 今後の改善点
- [ ] UIとデータモデルの整合性を取る
- [ ] `title`と`author`フィールドの実装
- [ ] 文字数制限の統一
- [ ] エラーハンドリングの改善
- [ ] ページネーション機能の追加
- [ ] ユーザー認証機能の検討