# 権限管理機能テストガイド

## 概要
このガイドは、実装された権限管理機能が正しく動作することを確認するための包括的なテスト手順を提供します。

## テスト対象機能
1. ✅ 自分の投稿に編集・削除ボタンが表示される
2. ✅ 他人の投稿にはボタンが表示されない
3. ✅ 編集ページで自分の投稿を編集できる
4. ✅ 他人の投稿の編集URLにアクセスするとエラーが表示される
5. ✅ APIに不正なリクエストを送ると403エラーが返る
6. ✅ 削除確認ダイアログが表示される

---

## 1. 単体テスト（Unit Test）

### 1.1 権限チェック関数のテスト

**テストファイル**: `src/lib/permissions/__tests__/utils.test.ts`

```typescript
import { canEditPost, canDeletePost, canPerformAction } from '../utils';
import { UserRole, Permission } from '../types';

describe('権限ユーティリティ関数', () => {
  describe('canEditPost', () => {
    it('自分の投稿を編集できる', () => {
      const result = canEditPost('user123', UserRole.USER, 'user123');
      expect(result).toBe(true);
    });

    it('他人の投稿を編集できない', () => {
      const result = canEditPost('user123', UserRole.USER, 'user456');
      expect(result).toBe(false);
    });

    it('管理者は他人の投稿も編集できる', () => {
      const result = canEditPost('admin123', UserRole.ADMIN, 'user456');
      expect(result).toBe(true);
    });
  });

  describe('canDeletePost', () => {
    it('自分の投稿を削除できる', () => {
      const result = canDeletePost('user123', UserRole.USER, 'user123');
      expect(result).toBe(true);
    });

    it('他人の投稿を削除できない', () => {
      const result = canDeletePost('user123', UserRole.USER, 'user456');
      expect(result).toBe(false);
    });

    it('モデレーターは他人の投稿も削除できる', () => {
      const result = canDeletePost('mod123', UserRole.MODERATOR, 'user456');
      expect(result).toBe(true);
    });
  });
});
```

**実行コマンド**:
```bash
npm test -- src/lib/permissions/__tests__/utils.test.ts
```

### 1.2 コンポーネントのテスト

**テストファイル**: `src/components/__tests__/PostItem.test.tsx`

```typescript
import { render, screen } from '@testing-library/react';
import PostItem from '../PostItem';

describe('PostItemコンポーネント', () => {
  const mockPost = {
    _id: 'post123',
    content: 'テスト投稿',
    author: 'user123',
    createdAt: new Date().toISOString(),
    canEdit: false,
    canDelete: false
  };

  it('自分の投稿に編集・削除ボタンが表示される', () => {
    const ownPost = { ...mockPost, canEdit: true, canDelete: true };
    render(<PostItem post={ownPost} />);
    
    expect(screen.getByRole('button', { name: /編集/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /削除/i })).toBeInTheDocument();
  });

  it('他人の投稿にボタンが表示されない', () => {
    render(<PostItem post={mockPost} />);
    
    expect(screen.queryByRole('button', { name: /編集/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /削除/i })).not.toBeInTheDocument();
  });
});
```

---

## 2. 結合テスト（Integration Test）

### 2.1 APIエンドポイントのテスト

**テストファイル**: `__tests__/api/posts.test.ts`

```typescript
import { createMocks } from 'node-mocks-http';
import { POST, PUT, DELETE } from '@/app/api/posts/[id]/route';

describe('Posts API 権限チェック', () => {
  describe('PUT /api/posts/[id]', () => {
    it('自分の投稿を編集できる', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: { 
          'Cookie': 'test-auth-token=valid_user_token' 
        },
        body: { content: '更新された内容' }
      });

      await PUT(req, { params: { id: 'user_post_id' } });
      expect(res._getStatusCode()).toBe(200);
    });

    it('他人の投稿を編集しようとすると403エラー', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        headers: { 
          'Cookie': 'test-auth-token=valid_user_token' 
        },
        body: { content: '不正な更新' }
      });

      await PUT(req, { params: { id: 'other_user_post_id' } });
      expect(res._getStatusCode()).toBe(403);
    });

    it('未認証ユーザーは401エラー', async () => {
      const { req, res } = createMocks({
        method: 'PUT',
        body: { content: '更新' }
      });

      await PUT(req, { params: { id: 'any_post_id' } });
      expect(res._getStatusCode()).toBe(401);
    });
  });

  describe('DELETE /api/posts/[id]', () => {
    it('自分の投稿を削除できる', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        headers: { 
          'Cookie': 'test-auth-token=valid_user_token' 
        }
      });

      await DELETE(req, { params: { id: 'user_post_id' } });
      expect(res._getStatusCode()).toBe(200);
    });

    it('他人の投稿を削除しようとすると403エラー', async () => {
      const { req, res } = createMocks({
        method: 'DELETE',
        headers: { 
          'Cookie': 'test-auth-token=valid_user_token' 
        }
      });

      await DELETE(req, { params: { id: 'other_user_post_id' } });
      expect(res._getStatusCode()).toBe(403);
    });
  });
});
```

### 2.2 統合テストスクリプト

**ファイル**: `scripts/integration-test.js`

```javascript
#!/usr/bin/env node

const BASE_URL = 'http://localhost:3000';

async function runIntegrationTests() {
  console.log('🧪 統合テスト開始\n');
  
  // 1. ユーザーAでログイン
  const userA = await login('userA@test.local', 'password123');
  const postA = await createPost(userA.token, 'ユーザーAの投稿');
  
  // 2. ユーザーBでログイン
  const userB = await login('userB@test.local', 'password456');
  const postB = await createPost(userB.token, 'ユーザーBの投稿');
  
  // 3. ユーザーAが自分の投稿を編集
  const editOwnResult = await editPost(userA.token, postA.id, '編集済み');
  console.assert(editOwnResult.status === 200, '✅ 自分の投稿を編集');
  
  // 4. ユーザーAが他人の投稿を編集しようとする
  const editOthersResult = await editPost(userA.token, postB.id, '不正編集');
  console.assert(editOthersResult.status === 403, '✅ 他人の投稿編集を拒否');
  
  // 5. ユーザーAが自分の投稿を削除
  const deleteOwnResult = await deletePost(userA.token, postA.id);
  console.assert(deleteOwnResult.status === 200, '✅ 自分の投稿を削除');
  
  // 6. ユーザーAが他人の投稿を削除しようとする
  const deleteOthersResult = await deletePost(userA.token, postB.id);
  console.assert(deleteOthersResult.status === 403, '✅ 他人の投稿削除を拒否');
  
  console.log('\n✅ 統合テスト完了');
}

// 実行
runIntegrationTests().catch(console.error);
```

---

## 3. E2Eテスト（End-to-End Test）

### 3.1 Playwrightテスト

**ファイル**: `e2e/permissions-full.spec.ts`

```typescript
import { test, expect } from '@playwright/test';

test.describe('権限管理機能の完全テスト', () => {
  let userAEmail = 'testA@example.com';
  let userBEmail = 'testB@example.com';
  let postAId: string;
  let postBId: string;

  test.beforeAll(async ({ browser }) => {
    // ユーザーA・Bを作成し、それぞれ投稿を作成
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // ユーザーA登録・投稿作成
    await page.goto('/auth/signup');
    await page.fill('input[name="email"]', userAEmail);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.fill('input[name="confirmPassword"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.goto('/board');
    await page.fill('textarea', 'ユーザーAの投稿');
    await page.click('button:has-text("投稿")');
    postAId = await page.locator('.post-item').first().getAttribute('data-post-id');
    
    // ログアウト
    await page.click('button:has-text("ログアウト")');
    
    // ユーザーB登録・投稿作成
    // ... 同様の処理
  });

  test('自分の投稿に編集・削除ボタンが表示される', async ({ page }) => {
    // ユーザーAでログイン
    await page.goto('/auth/login');
    await page.fill('input[name="email"]', userAEmail);
    await page.fill('input[name="password"]', 'Test123!@#');
    await page.click('button[type="submit"]');
    
    await page.goto('/board');
    
    // 自分の投稿を探す
    const myPost = page.locator(`[data-post-id="${postAId}"]`);
    
    // 編集・削除ボタンが表示されることを確認
    await expect(myPost.locator('button:has-text("編集")')).toBeVisible();
    await expect(myPost.locator('button:has-text("削除")')).toBeVisible();
  });

  test('他人の投稿にはボタンが表示されない', async ({ page }) => {
    // ユーザーAでログイン（継続）
    const othersPost = page.locator(`[data-post-id="${postBId}"]`);
    
    // 編集・削除ボタンが表示されないことを確認
    await expect(othersPost.locator('button:has-text("編集")')).not.toBeVisible();
    await expect(othersPost.locator('button:has-text("削除")')).not.toBeVisible();
  });

  test('編集ダイアログで自分の投稿を編集できる', async ({ page }) => {
    const myPost = page.locator(`[data-post-id="${postAId}"]`);
    
    // 編集ボタンをクリック
    await myPost.locator('button:has-text("編集")').click();
    
    // ダイアログが表示される
    await expect(page.locator('.MuiDialog-root')).toBeVisible();
    
    // 内容を編集
    const textarea = page.locator('.MuiDialog-root textarea');
    await textarea.clear();
    await textarea.fill('編集された投稿内容');
    
    // 保存
    await page.click('button:has-text("保存")');
    
    // 更新された内容が表示される
    await expect(myPost).toContainText('編集された投稿内容');
  });

  test('他人の投稿の編集URLに直接アクセスするとエラー', async ({ page }) => {
    // 他人の投稿の編集URLに直接アクセス
    await page.goto(`/posts/${postBId}/edit`);
    
    // エラーメッセージが表示される
    await expect(page.locator('text=権限がありません')).toBeVisible();
  });

  test('削除確認ダイアログが表示される', async ({ page }) => {
    await page.goto('/board');
    const myPost = page.locator(`[data-post-id="${postAId}"]`);
    
    // 削除ボタンをクリック
    await myPost.locator('button:has-text("削除")').click();
    
    // 確認ダイアログが表示される
    await expect(page.locator('.MuiDialog-root')).toBeVisible();
    await expect(page.locator('text=本当に削除しますか？')).toBeVisible();
    
    // キャンセルボタンがある
    await expect(page.locator('button:has-text("キャンセル")')).toBeVisible();
    
    // 削除ボタンがある
    await expect(page.locator('button:has-text("削除する")')).toBeVisible();
    
    // 削除を実行
    await page.click('button:has-text("削除する")');
    
    // 投稿が削除される
    await expect(myPost).not.toBeVisible();
  });

  test('APIに不正なリクエストを送ると403エラー', async ({ request, page }) => {
    // ユーザーAでログイン後、クッキーを取得
    const cookies = await page.context().cookies();
    
    // 他人の投稿を編集しようとする
    const response = await request.put(`/api/posts/${postBId}`, {
      headers: {
        'Cookie': cookies.map(c => `${c.name}=${c.value}`).join('; ')
      },
      data: {
        content: '不正な編集'
      }
    });
    
    expect(response.status()).toBe(403);
    const body = await response.json();
    expect(body.error).toContain('権限がありません');
  });
});
```

### 3.2 実行コマンド

```bash
# E2Eテスト実行
npx playwright test e2e/permissions-full.spec.ts

# ヘッドレスモードで実行
npx playwright test e2e/permissions-full.spec.ts --headed

# デバッグモード
npx playwright test e2e/permissions-full.spec.ts --debug
```

---

## 4. 手動テストチェックリスト

### 4.1 UI表示確認

- [ ] ログインしていない状態で投稿一覧を表示
  - [ ] すべての投稿に編集・削除ボタンが表示されない
- [ ] ユーザーAでログイン
  - [ ] 自分の投稿に編集・削除ボタンが表示される
  - [ ] 他人の投稿にボタンが表示されない
- [ ] ユーザーBでログイン
  - [ ] 自分の投稿に編集・削除ボタンが表示される
  - [ ] ユーザーAの投稿にボタンが表示されない

### 4.2 編集機能確認

- [ ] 自分の投稿の編集ボタンをクリック
  - [ ] 編集ダイアログが表示される
  - [ ] 現在の内容が表示される
  - [ ] 内容を変更して保存できる
  - [ ] 保存後、変更が反映される
- [ ] ブラウザのアドレスバーに他人の投稿の編集URLを直接入力
  - [ ] エラーメッセージが表示される
  - [ ] 編集画面にアクセスできない

### 4.3 削除機能確認

- [ ] 自分の投稿の削除ボタンをクリック
  - [ ] 確認ダイアログが表示される
  - [ ] 「本当に削除しますか？」のメッセージ
  - [ ] キャンセルボタンで中止できる
  - [ ] 削除ボタンで削除できる
  - [ ] 削除後、投稿が一覧から消える

### 4.4 API直接アクセス確認

開発者ツールのコンソールで実行：

```javascript
// 他人の投稿IDを取得
const othersPostId = '他人の投稿ID';

// 編集を試みる
fetch(`/api/posts/${othersPostId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: '不正な編集' })
}).then(res => {
  console.log('Status:', res.status); // 403が期待値
  return res.json();
}).then(data => {
  console.log('Response:', data); // エラーメッセージ
});

// 削除を試みる
fetch(`/api/posts/${othersPostId}`, {
  method: 'DELETE'
}).then(res => {
  console.log('Status:', res.status); // 403が期待値
});
```

---

## 5. 自動テスト実行スクリプト

**ファイル**: `scripts/run-all-permission-tests.sh`

```bash
#!/bin/bash

echo "🧪 権限管理機能の包括的テスト開始"
echo "=================================="

# 1. 単体テスト
echo "\n📝 単体テスト実行中..."
npm test -- src/lib/permissions/__tests__
npm test -- src/components/__tests__

# 2. 結合テスト
echo "\n🔗 結合テスト実行中..."
node scripts/integration-test.js

# 3. E2Eテスト
echo "\n🌐 E2Eテスト実行中..."
npx playwright test e2e/permissions-full.spec.ts

# 4. ロールベーステスト
echo "\n👥 ロールベーステスト実行中..."
node scripts/test-roles-improved.js

echo "\n✅ すべてのテスト完了"
```

実行：
```bash
chmod +x scripts/run-all-permission-tests.sh
./scripts/run-all-permission-tests.sh
```

---

## 6. テスト結果レポートテンプレート

```markdown
# 権限管理機能テスト結果

## テスト実施日: YYYY-MM-DD

### 単体テスト結果
- canEditPost: ✅ 10/10 passed
- canDeletePost: ✅ 10/10 passed
- PostItemコンポーネント: ✅ 5/5 passed

### 結合テスト結果
- API権限チェック: ✅ 8/8 passed
- セッション管理: ✅ 4/4 passed

### E2Eテスト結果
- UI表示: ✅ 6/6 passed
- 編集機能: ✅ 4/4 passed
- 削除機能: ✅ 5/5 passed
- エラーハンドリング: ✅ 3/3 passed

### 手動テスト結果
- [ ] すべてのチェックリスト項目を確認

### 総合評価
- 合格率: 100%
- 状態: ✅ リリース可能
```

---

## 7. トラブルシューティング

### よくある問題と解決方法

1. **テストが失敗する場合**
   ```bash
   # データベースをリセット
   npm run db:reset
   
   # テストユーザーを再作成
   node scripts/setup-test-users.js
   ```

2. **E2Eテストがタイムアウトする**
   ```javascript
   // playwright.config.ts で調整
   timeout: 60 * 1000, // 60秒に増加
   ```

3. **権限が正しく動作しない**
   ```bash
   # セッションをクリア
   rm -rf .next
   npm run dev
   ```

---

このガイドに従って、権限管理機能が正しく動作することを包括的に確認できます。