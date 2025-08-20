# 🎨 UI要素微調整実装計画

## 📊 ギャップ分析結果

### テストと実装の不一致箇所

| カテゴリ | テストの期待 | 実際の実装 | 修正方法 | 優先度 | 推定時間 |
|---------|------------|-----------|---------|--------|---------|
| **ページタイトル** | "新規登録 \| Sign Up" | "会員制掲示板"（継承） | metadata設定追加 | High | 10分 |
| **ログインヘッダー** | "ログイン" | "おかえりなさい" | テストを実装に合わせる（済） | Low | 完了 |
| **エラー表示セレクタ** | `.error-message` | styled-jsxインライン | 共通クラス追加 | Medium | 15分 |
| **パスワード強度** | `[data-strength]` | コンポーネント内部のみ | data属性追加 | Medium | 10分 |
| **MUIアラート** | `.MuiAlert-standardSuccess` | verify/page.tsxのみ | 統一検討 | Low | 20分 |
| **ボタンテキスト** | "登録" | "新規登録" | テスト調整 | Low | 5分 |
| **フィールドヘルパー** | `#email-helper-text` | インラインstyle | id属性追加 | Medium | 15分 |
| **ナビゲーションリンク** | クリック可能 | ヘッダーが遮る | z-index調整（済） | High | 完了 |

## ✅ 即座に修正可能な項目（Phase 1: 30分）

### 1. ページメタデータの設定

#### `/src/app/auth/signup/page.tsx`
```typescript
// 追加: ファイルの先頭付近
export const metadata = {
  title: '新規登録 - 会員制掲示板',
  description: 'アカウントを作成して始めましょう',
};
```

#### `/src/app/auth/signin/page.tsx`
```typescript
export const metadata = {
  title: 'ログイン - 会員制掲示板',
  description: 'アカウントにログインして続ける',
};
```

#### `/src/app/auth/verify-email/page.tsx`
```typescript
export const metadata = {
  title: 'メール確認 - 会員制掲示板',
  description: 'メールアドレスの確認を行います',
};
```

### 2. エラーメッセージのクラス名統一

#### 各ページの共通スタイル追加
```typescript
// エラーメッセージにクラス名を追加
{error && (
  <div 
    className="error-message"  // 追加
    style={{
      padding: '12px',
      backgroundColor: '#fef2f2',
      // ... 既存のスタイル
    }}
  >
    {error}
  </div>
)}

// フィールドエラーにもクラスとID追加
{formErrors.email && (
  <div 
    className="field-error"
    id="email-helper-text"
    style={{
      fontSize: '12px',
      color: '#dc2626',
      // ... 既存のスタイル
    }}
  >
    {formErrors.email}
  </div>
)}
```

### 3. パスワード強度のdata属性追加

#### `/src/components/PasswordStrengthIndicator.tsx`
```typescript
// 強度バーコンテナにdata属性を追加
<div 
  className="password-strength-container"
  data-strength={
    strength.score <= 2 ? 'weak' : 
    strength.score <= 3 ? 'medium' : 
    'strong'
  }
  style={{
    marginTop: '8px',
    // ... 既存のスタイル
  }}
>
```

## 🔧 UIコンポーネント調整（Phase 2: 45分）

### 1. 共通エラーコンポーネントの作成

#### `/src/components/auth/ErrorMessage.tsx`（新規作成）
```typescript
'use client';

interface ErrorMessageProps {
  error?: string;
  fieldName?: string;
  type?: 'field' | 'form';
}

export function ErrorMessage({ error, fieldName, type = 'field' }: ErrorMessageProps) {
  if (!error) return null;
  
  const baseClass = type === 'field' ? 'field-error' : 'error-message';
  const id = fieldName ? `${fieldName}-helper-text` : undefined;
  
  return (
    <div 
      className={`${baseClass} MuiFormHelperText-root Mui-error`}
      id={id}
      role="alert"
      aria-live="polite"
      style={{
        fontSize: type === 'field' ? '12px' : '14px',
        color: '#dc2626',
        marginTop: type === 'field' ? '4px' : '0',
        padding: type === 'form' ? '12px' : '0',
        backgroundColor: type === 'form' ? '#fef2f2' : 'transparent',
        border: type === 'form' ? '1px solid #fecaca' : 'none',
        borderRadius: type === 'form' ? '8px' : '0',
      }}
    >
      {error}
    </div>
  );
}
```

### 2. 成功メッセージコンポーネント

#### `/src/components/auth/SuccessMessage.tsx`（新規作成）
```typescript
'use client';

interface SuccessMessageProps {
  message?: string;
}

export function SuccessMessage({ message }: SuccessMessageProps) {
  if (!message) return null;
  
  return (
    <div 
      className="success-message MuiAlert-standardSuccess"
      role="status"
      aria-live="polite"
      style={{
        padding: '12px',
        backgroundColor: '#f0fdf4',
        border: '1px solid #86efac',
        borderRadius: '8px',
        color: '#16a34a',
        marginBottom: '16px',
      }}
    >
      {message}
    </div>
  );
}
```

### 3. フォームフィールドのアクセシビリティ向上

```typescript
// 各入力フィールドにaria属性を追加
<input
  type="email"
  name="email"
  id="email"  // 追加
  aria-describedby="email-helper-text"  // 追加
  aria-invalid={!!formErrors.email}  // 追加
  value={formData.email}
  onChange={handleChange}
  onBlur={handleBlur}
  required
  style={inputStyle}
/>
```

## 🎯 テスト側の調整（Phase 3: 15分）

### 1. より柔軟なセレクタヘルパー

#### `/src/e2e/helpers/selectors.ts`（新規作成）
```typescript
import { Page } from '@playwright/test';

export class AuthSelectors {
  static errorMessage = '.error-message, .MuiAlert-standardError, [role="alert"]';
  static successMessage = '.success-message, .MuiAlert-standardSuccess, [role="status"]';
  static fieldError = (field: string) => `#${field}-helper-text, [data-field="${field}"] .error`;
  static passwordStrength = '[data-strength], .password-strength-container';
  static submitButton = 'button[type="submit"]';
  static loadingIndicator = '.loading, .MuiCircularProgress-root, [role="progressbar"]';
}

export async function waitForAuthPage(page: Page, type: 'signup' | 'signin' | 'verify') {
  const patterns = {
    signup: /新規登録|sign up|register|アカウント作成/i,
    signin: /ログイン|sign in|おかえり|welcome/i,
    verify: /メール|確認|verify/i,
  };
  
  await page.waitForSelector('h1, h2', { timeout: 5000 });
  const heading = await page.textContent('h1, h2');
  
  if (!patterns[type].test(heading || '')) {
    throw new Error(`Expected ${type} page but got: ${heading}`);
  }
}

export async function getErrorMessage(page: Page): Promise<string | null> {
  const element = await page.$(AuthSelectors.errorMessage);
  return element ? await element.textContent() : null;
}

export async function getSuccessMessage(page: Page): Promise<string | null> {
  const element = await page.$(AuthSelectors.successMessage);
  return element ? await element.textContent() : null;
}
```

### 2. テストケースの更新

```typescript
// 既存のテストを新しいヘルパーで更新
import { AuthSelectors, waitForAuthPage, getErrorMessage } from '../helpers/selectors';

test('正常な新規登録が成功する', async ({ page }) => {
  await page.goto('/auth/signup');
  await waitForAuthPage(page, 'signup');
  
  // ... フォーム入力
  
  await page.click(AuthSelectors.submitButton);
  
  // 成功の確認
  const success = await getSuccessMessage(page);
  expect(success).toBeTruthy();
});
```

## 📝 実装チェックリスト

### Phase 1: クリティカルな修正（30分）
- [ ] 各ページにmetadata追加
- [ ] エラーメッセージにクラス名追加
- [ ] フィールドエラーにID追加
- [ ] パスワード強度にdata属性追加

### Phase 2: UIコンポーネント調整（45分）
- [ ] ErrorMessageコンポーネント作成
- [ ] SuccessMessageコンポーネント作成
- [ ] 既存ページで新コンポーネントを使用
- [ ] aria属性の追加

### Phase 3: テストの最適化（15分）
- [ ] selectorsヘルパー作成
- [ ] テストケースを新ヘルパーで更新
- [ ] タイムアウト値の調整

### Phase 4: 検証（30分）
- [ ] 個別テスト実行
- [ ] 全体テスト実行
- [ ] レポート生成

## 🎯 期待される成果

### 修正前
- テスト成功率: 71.4%
- UI一貫性: 部分的
- メンテナンス性: 中

### 修正後（目標）
- テスト成功率: 95%以上
- UI一貫性: 完全統一
- メンテナンス性: 高
- アクセシビリティ: WCAG 2.1 Level A準拠

## 🚀 実装順序

1. **即座対応（10分）**: metadata設定
2. **クラス名統一（20分）**: エラー/成功メッセージ
3. **属性追加（10分）**: data-*, aria-*, id
4. **コンポーネント化（30分）**: 共通コンポーネント作成
5. **テスト調整（15分）**: ヘルパー関数
6. **検証（30分）**: テスト実行と確認

**総所要時間**: 約2時間

---

*作成日: 2025-08-10*  
*次回レビュー: 実装完了後*