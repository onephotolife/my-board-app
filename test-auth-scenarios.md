# 🧪 会員限定ページ保護機能 - 詳細テストシナリオ

## 📝 具体的なテストケース

### テストケース 1: 未認証アクセスの拒否とリダイレクト

#### 前提条件
- ブラウザのクッキーとセッションをクリア
- シークレット/プライベートウィンドウを使用

#### テスト手順
```bash
# 1. サーバーを起動
npm run dev

# 2. 以下のURLに直接アクセス
http://localhost:3000/dashboard
http://localhost:3000/profile
http://localhost:3000/posts/new
http://localhost:3000/posts/123/edit
```

#### 期待される結果
- ✅ 即座にサインインページ（`/auth/signin`）へリダイレクト
- ✅ URLに`callbackUrl`パラメータが含まれている
- ✅ 例: `/auth/signin?callbackUrl=/dashboard`

#### 確認コマンド（開発者ツール）
```javascript
// 現在のURLパラメータを確認
const params = new URLSearchParams(window.location.search);
console.log('Callback URL:', params.get('callbackUrl'));

// セッション状態を確認
fetch('/api/auth/session')
  .then(res => res.json())
  .then(data => console.log('Session:', data));
```

---

### テストケース 2: ログイン後の元ページへの復帰

#### 前提条件
- テストユーザーアカウントが作成済み
- 未認証状態からスタート

#### テスト手順
```markdown
1. `/dashboard` にアクセス
2. `/auth/signin?callbackUrl=/dashboard` へリダイレクトされることを確認
3. 有効な認証情報を入力:
   - Email: test@example.com
   - Password: TestPassword123!
4. ログインボタンをクリック
```

#### 期待される結果
- ✅ ログイン成功後、`/dashboard` へ自動遷移
- ✅ ダッシュボードページが正常に表示
- ✅ ユーザー情報が表示されている

---

### テストケース 3: APIエンドポイントの保護

#### テスト手順
```bash
# 未認証状態でAPIにアクセス
curl -X GET http://localhost:3000/api/posts \
  -H "Content-Type: application/json"

# 認証トークン付きでアクセス
curl -X GET http://localhost:3000/api/posts \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=[SESSION_TOKEN]"
```

#### 期待される結果
```json
// 未認証時のレスポンス
{
  "error": "Unauthorized",
  "status": 401
}

// 認証済みのレスポンス
{
  "posts": [...],
  "status": 200
}
```

---

### テストケース 4: ローディング状態とエラーハンドリング

#### テスト手順
```javascript
// ネットワーク速度を制限（開発者ツール → Network → Slow 3G）
// 1. 保護されたページにアクセス
// 2. ローディング状態を確認
```

#### 期待される結果
- ✅ CircularProgressコンポーネントが表示
- ✅ 「読み込み中...」テキストが表示
- ✅ レイアウトシフトが発生しない

---

### テストケース 5: セッション管理

#### テスト手順
```markdown
1. ユーザーとしてログイン
2. 新しいタブを開く
3. 同じ保護されたページにアクセス
4. ブラウザをリロード
5. 30分間放置（セッションタイムアウトテスト）
```

#### 確認スクリプト
```javascript
// セッション有効期限を確認
async function checkSessionExpiry() {
  const response = await fetch('/api/auth/session');
  const session = await response.json();
  
  if (session.expires) {
    const expiryDate = new Date(session.expires);
    const now = new Date();
    const remainingMinutes = Math.floor((expiryDate - now) / 60000);
    console.log(`Session expires in ${remainingMinutes} minutes`);
  }
}

checkSessionExpiry();
```

---

## 🤖 自動テストスクリプト

### E2Eテスト（Cypress）

```javascript
// cypress/e2e/auth-protection.cy.js

describe('Authentication Protection', () => {
  beforeEach(() => {
    cy.clearCookies();
    cy.clearLocalStorage();
  });

  it('should redirect unauthenticated users to signin', () => {
    cy.visit('/dashboard');
    cy.url().should('include', '/auth/signin');
    cy.url().should('include', 'callbackUrl=/dashboard');
  });

  it('should return to original page after login', () => {
    // 保護されたページにアクセス
    cy.visit('/dashboard');
    
    // サインインページへリダイレクト
    cy.url().should('include', '/auth/signin');
    
    // ログイン
    cy.get('input[type="email"]').type('test@example.com');
    cy.get('input[type="password"]').type('TestPassword123!');
    cy.get('button[type="submit"]').click();
    
    // 元のページへ戻る
    cy.url().should('include', '/dashboard');
    cy.contains('ダッシュボード').should('be.visible');
  });

  it('should show loading state', () => {
    cy.intercept('GET', '/api/auth/session', (req) => {
      req.reply((res) => {
        res.delay(2000); // 2秒遅延
      });
    });

    cy.visit('/dashboard');
    cy.contains('読み込み中...').should('be.visible');
  });

  it('should handle API authentication', () => {
    // 未認証でAPIアクセス
    cy.request({
      url: '/api/posts',
      failOnStatusCode: false
    }).then((response) => {
      expect(response.status).to.eq(401);
    });
  });
});
```

### ユニットテスト（Jest）

```javascript
// __tests__/auth-guard.test.tsx

import { render, screen, waitFor } from '@testing-library/react';
import { useSession } from 'next-auth/react';
import AuthGuard from '@/components/AuthGuard';

jest.mock('next-auth/react');
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
  }),
  usePathname: () => '/dashboard',
}));

describe('AuthGuard Component', () => {
  it('shows loading state initially', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'loading',
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('読み込み中...')).toBeInTheDocument();
  });

  it('shows login required message when unauthenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: null,
      status: 'unauthenticated',
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('ログインが必要です')).toBeInTheDocument();
  });

  it('renders children when authenticated', () => {
    (useSession as jest.Mock).mockReturnValue({
      data: {
        user: {
          email: 'test@example.com',
          emailVerified: true,
        },
      },
      status: 'authenticated',
    });

    render(
      <AuthGuard>
        <div>Protected Content</div>
      </AuthGuard>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
```

---

## 🔒 セキュリティテスト

### CSRFトークンの確認
```javascript
// CSRFトークンの存在確認
async function checkCSRF() {
  const response = await fetch('/api/auth/csrf');
  const data = await response.json();
  console.log('CSRF Token:', data.csrfToken);
  return data.csrfToken;
}

checkCSRF();
```

### セッションハイジャックテスト
```javascript
// 異なるIPからの同一セッショントークン使用を試みる
// （実際には別環境から実行）
const stolenToken = 'stolen-session-token';
fetch('/api/posts', {
  headers: {
    'Cookie': `next-auth.session-token=${stolenToken}`
  }
}).then(res => console.log('Status:', res.status));
```

---

## 📊 パフォーマンステスト

### 認証処理の応答時間測定
```javascript
async function measureAuthPerformance() {
  const iterations = 10;
  const times = [];
  
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    
    await fetch('/api/auth/session');
    
    const end = performance.now();
    times.push(end - start);
  }
  
  const average = times.reduce((a, b) => a + b, 0) / times.length;
  console.log(`Average response time: ${average.toFixed(2)}ms`);
  console.log(`Min: ${Math.min(...times).toFixed(2)}ms`);
  console.log(`Max: ${Math.max(...times).toFixed(2)}ms`);
}

measureAuthPerformance();
```

---

## ✅ 最終チェックリスト

### 機能テスト
- [ ] 未認証ユーザーのアクセス拒否
- [ ] サインインページへの適切なリダイレクト
- [ ] callbackURLの保持と復帰
- [ ] セッション維持（リロード、複数タブ）
- [ ] ログアウト後のアクセス制限
- [ ] メール未確認ユーザーの制限

### UI/UXテスト
- [ ] ローディング状態の表示
- [ ] エラーメッセージの適切な表示
- [ ] レスポンシブデザイン（モバイル/タブレット/PC）
- [ ] キーボードナビゲーション
- [ ] スクリーンリーダー対応

### セキュリティテスト
- [ ] CSRF対策の確認
- [ ] XSS脆弱性チェック
- [ ] セッション固定攻撃への対策
- [ ] セキュアなクッキー設定（httpOnly, secure, sameSite）

### パフォーマンステスト
- [ ] 認証処理の応答時間（< 200ms）
- [ ] 同時接続テスト（100ユーザー）
- [ ] メモリリークの確認

### エラー処理テスト
- [ ] ネットワークエラー時の処理
- [ ] APIタイムアウトの処理
- [ ] 無効なセッショントークンの処理
- [ ] データベース接続エラーの処理

---

## 🐛 トラブルシューティング

### よくある問題と解決方法

#### 1. リダイレクトループ
```javascript
// 確認方法
console.log('Current Path:', window.location.pathname);
console.log('Redirect Count:', performance.navigation.redirectCount);
```

#### 2. セッションが維持されない
```javascript
// クッキーの確認
document.cookie.split(';').forEach(cookie => {
  if (cookie.includes('next-auth')) {
    console.log('Auth Cookie:', cookie);
  }
});
```

#### 3. CORS エラー
```javascript
// APIリクエストヘッダーの確認
fetch('/api/posts', {
  credentials: 'include', // 重要：クッキーを含める
  headers: {
    'Content-Type': 'application/json',
  }
});
```