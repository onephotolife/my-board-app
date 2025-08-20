# 🚨 JSXパースエラー緊急修正プロンプト

## 🔴 報告されたエラー

### エラー詳細
```
./src/app/page.tsx:217:17
Parsing ecmascript source code failed
  215 |                   新規登録
  216 |                 </Link>
> 217 |               </div>
      |                 ^^^
  218 |               
  219 |               <div style={{ textAlign: 'center', marginTop: '20px' }}>
  220 |                 <Link

Expected '</', got 'div'
```

## 🧠 エラー原因の分析

### Phase 1: エラーの種類特定
```markdown
エラータイプ: JSX構文エラー
原因: タグの閉じ忘れまたは不適切なネスト
影響: アプリケーション全体のクラッシュ
```

### Phase 2: 問題箇所の特定
```typescript
// エラー発生箇所（line 217付近）
// 期待される構造:
<親要素>
  <Link>新規登録</Link>
</親要素>  // <- ここが閉じられていない可能性

// 実際の構造:
<Link>新規登録</Link>
</div>  // <- 対応する開始タグがない
```

### Phase 3: 根本原因の推測
```markdown
可能性のある原因:
1. 条件分岐の括弧の不一致
2. 三項演算子の構造エラー
3. Fragment や親要素の閉じ忘れ
4. 複数のreturn文での構造不一致
```

## 📋 即座の修正手順

### Step 1: エラー箇所の完全な確認
```bash
# ファイルの該当箇所を詳細に確認
cat -n src/app/page.tsx | sed -n '200,230p'
```

### Step 2: JSX構造の検証
```typescript
// 正しいJSX構造のチェックリスト
1. すべての開始タグに対応する終了タグがある
2. 条件分岐の括弧が正しく閉じられている
3. 三項演算子の構造が正しい
4. Fragment（<> </>）が適切に使用されている
```

### Step 3: 問題のある構造パターン

#### パターン1: 条件分岐の不一致
```typescript
// ❌ 間違い
{status === 'authenticated' ? (
  <div>
    <Link>ボタン1</Link>
  </div>
) : (
  <Link>ボタン2</Link>
  </div>  // <- 開始タグがない
)}

// ✅ 正しい
{status === 'authenticated' ? (
  <div>
    <Link>ボタン1</Link>
  </div>
) : (
  <div>
    <Link>ボタン2</Link>
  </div>
)}
```

#### パターン2: Fragment の不適切な使用
```typescript
// ❌ 間違い
<>
  <Link>リンク</Link>
</div>  // <- Fragmentの終了タグではない

// ✅ 正しい
<>
  <Link>リンク</Link>
</>
```

## 🔧 修正実装

### 即座の修正コード
```typescript
// src/app/page.tsx の修正箇所（推定）

// Before（エラーのある構造）
{status === 'authenticated' ? (
  // ログイン時の表示
) : (
  <>
    <Link href="/auth/signin">
      ログイン
    </Link>
    <Link href="/auth/signup">
      新規登録
    </Link>
  </div>  // ❌ <>で開始しているのに</div>で閉じている
  
  <div style={{ textAlign: 'center', marginTop: '20px' }}>
    <Link href="/auth/reset-password">
      パスワードを忘れた方はこちら
    </Link>
  </div>
)}

// After（修正版）
{status === 'authenticated' ? (
  // ログイン時の表示
) : (
  <>
    <div>
      <Link href="/auth/signin">
        ログイン
      </Link>
      <Link href="/auth/signup">
        新規登録
      </Link>
    </div>
    
    <div style={{ textAlign: 'center', marginTop: '20px' }}>
      <Link href="/auth/reset-password">
        パスワードを忘れた方はこちら
      </Link>
    </div>
  </>
)}
```

## 🛠️ ベストプラクティス実装

### 1. コンポーネント分割による可読性向上
```typescript
// 認証済みビューと未認証ビューを分離
const AuthenticatedView = () => (
  <Container>
    <WelcomeSection session={session} />
    {/* その他の認証済みコンテンツ */}
  </Container>
);

const UnauthenticatedView = () => (
  <div style={contentStyle}>
    <div style={heroStyle}>
      <h1>{title}</h1>
      <p>{subtitle}</p>
      <AuthButtons />
      <PasswordResetLink />
      <Features />
    </div>
  </div>
);

// メインコンポーネント
return status === 'authenticated' ? <AuthenticatedView /> : <UnauthenticatedView />;
```

### 2. 小さなコンポーネントへの分割
```typescript
const AuthButtons = () => (
  <div style={buttonContainerStyle}>
    <Link href="/auth/signin" style={primaryButtonStyle}>
      ログイン
    </Link>
    <Link href="/auth/signup" style={secondaryButtonStyle}>
      新規登録
    </Link>
  </div>
);

const PasswordResetLink = () => (
  <div style={{ textAlign: 'center', marginTop: '20px' }}>
    <Link href="/auth/reset-password" style={linkStyle}>
      パスワードを忘れた方はこちら
    </Link>
  </div>
);
```

### 3. ESLintルールの追加
```javascript
// .eslintrc.json
{
  "extends": [
    "next/core-web-vitals",
    "plugin:react/jsx-runtime"
  ],
  "rules": {
    "react/jsx-closing-bracket-location": "error",
    "react/jsx-closing-tag-location": "error",
    "react/jsx-tag-spacing": "error",
    "react/self-closing-comp": "error"
  }
}
```

## 🔍 検証方法

### 1. 構文チェック
```bash
# TypeScriptコンパイラでチェック
npx tsc --noEmit

# ESLintでチェック
npm run lint

# Prettierでフォーマット
npx prettier --write src/app/page.tsx
```

### 2. ビジュアル検証
```javascript
// VSCodeの設定で括弧のペアを色分け
"editor.bracketPairColorization.enabled": true,
"editor.guides.bracketPairs": "active"
```

## 📊 予防策

### 1. 開発時のリアルタイムチェック
```json
// VSCode settings.json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "typescript.tsdk": "node_modules/typescript/lib"
}
```

### 2. Pre-commitフック
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ]
  }
}
```

### 3. CI/CDパイプライン
```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm ci
      - run: npm run lint
      - run: npm run type-check
```

## ⚠️ 注意事項

### やってはいけないこと
1. **深いネストの条件分岐**: 可読性が下がりエラーの原因になる
2. **インラインの複雑な三項演算子**: 別コンポーネントに分離すべき
3. **手動でのタグ管理**: IDEの自動補完を使用する

### 推奨事項
1. **コンポーネントの分割**: 100行を超えたら分割を検討
2. **名前付きコンポーネント**: デバッグが容易
3. **型安全性**: TypeScriptの厳密な型チェック

## 🚀 実装優先順位

### 緊急（5分以内）
1. JSXタグの不一致を修正
2. アプリケーションの動作確認

### 重要（30分以内）
1. コンポーネントの適切な分割
2. ESLintルールの追加
3. エラー防止策の実装

### 推奨（1時間以内）
1. テストケースの追加
2. CI/CDパイプラインの設定
3. ドキュメントの更新

---
*このプロンプトを使用して、JSXパースエラーを即座に修正し、再発を防止してください。*