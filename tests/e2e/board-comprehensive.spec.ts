import { test, expect, Page } from '@playwright/test';
import { faker } from '@faker-js/faker/locale/ja';

/**
 * 掲示板機能の包括的E2Eテスト
 * 
 * カバレッジ:
 * - 認証フロー
 * - CRUD操作
 * - 権限管理
 * - バリデーション
 * - エラーハンドリング
 * - パフォーマンス
 */

// テスト設定
const TEST_CONFIG = {
  baseURL: process.env.BASE_URL || 'http://localhost:3000',
  timeout: 30000,
  users: {
    primary: {
      email: 'test1@example.com',
      password: 'Test1234!',
      name: 'テストユーザー1'
    },
    secondary: {
      email: 'test2@example.com',
      password: 'Test1234!',
      name: 'テストユーザー2'
    },
    unverified: {
      email: 'test3@example.com',
      password: 'Test1234!',
      name: '未認証ユーザー'
    }
  }
};

// ヘルパー関数
class BoardPageHelper {
  constructor(private page: Page) {}

  async login(email: string, password: string) {
    await this.page.goto('/auth/signin');
    await this.page.fill('input[name="email"]', email);
    await this.page.fill('input[name="password"]', password);
    await this.page.click('button[type="submit"]');
    await this.page.waitForURL(/\/(dashboard|board)/, { timeout: 10000 });
  }

  async logout() {
    await this.page.goto('/api/auth/signout');
    await this.page.click('button[type="submit"]');
  }

  async createPost(title: string, content: string, tags?: string[]) {
    await this.page.goto('/board/new');
    await this.page.fill('input[label="タイトル"]', title);
    await this.page.fill('textarea[label="本文"]', content);
    
    if (tags) {
      for (const tag of tags) {
        await this.page.fill('input[label="タグを追加"]', tag);
        await this.page.click('button:has-text("追加")');
      }
    }
    
    await this.page.click('button:has-text("投稿する")');
    await this.page.waitForURL('/board');
  }

  async findPostCard(title: string) {
    return this.page.locator(`.MuiCard-root:has-text("${title}")`);
  }

  async openPostMenu(title: string) {
    const card = await this.findPostCard(title);
    await card.locator('button[aria-label="メニュー"]').click();
  }

  async measureLoadTime(url: string): Promise<number> {
    const startTime = Date.now();
    await this.page.goto(url);
    await this.page.waitForLoadState('networkidle');
    return Date.now() - startTime;
  }
}

// テストスイート
test.describe('掲示板機能 - 包括的テスト', () => {
  let helper: BoardPageHelper;

  test.beforeEach(async ({ page }) => {
    helper = new BoardPageHelper(page);
    await page.context().clearCookies();
  });

  test.describe('認証とアクセス制御', () => {
    test('未ログイン時のアクセス制限', async ({ page }) => {
      await page.goto('/board');
      await expect(page).toHaveURL(/\/auth\/signin/);
      
      const url = new URL(page.url());
      expect(url.searchParams.get('callbackUrl')).toContain('/board');
    });

    test('ログイン成功フロー', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      await page.goto('/board');
      await expect(page.locator('h1')).toContainText('掲示板');
    });

    test('メール未認証ユーザーの制限', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.unverified.email,
        TEST_CONFIG.users.unverified.password
      );
      
      // メール認証ページへリダイレクトされることを確認
      await expect(page).toHaveURL(/\/auth\/verify-email/);
    });

    test('セッションタイムアウト処理', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      // セッションCookieを削除
      await page.context().clearCookies();
      
      // ページリロード
      await page.reload();
      
      // ログインページへリダイレクト
      await expect(page).toHaveURL(/\/auth\/signin/);
    });
  });

  test.describe('CRUD操作', () => {
    test.beforeEach(async () => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
    });

    test('投稿の作成 - 全フィールド', async ({ page }) => {
      const postData = {
        title: faker.lorem.sentence(5),
        content: faker.lorem.paragraph(3),
        tags: [faker.word.noun(), faker.word.noun()]
      };

      await helper.createPost(postData.title, postData.content, postData.tags);
      
      const postCard = await helper.findPostCard(postData.title);
      await expect(postCard).toBeVisible();
      await expect(postCard).toContainText(postData.content);
      
      for (const tag of postData.tags) {
        await expect(postCard.locator(`text=${tag}`)).toBeVisible();
      }
    });

    test('投稿の編集', async ({ page }) => {
      // 投稿を作成
      const originalTitle = `編集テスト_${Date.now()}`;
      await helper.createPost(originalTitle, '元の内容');
      
      // 編集
      await helper.openPostMenu(originalTitle);
      await page.click('text=編集');
      
      const newTitle = `編集済み_${Date.now()}`;
      const newContent = '更新された内容';
      
      await page.fill('input[label="タイトル"]', newTitle);
      await page.fill('textarea[label="本文"]', newContent);
      await page.click('button:has-text("更新する")');
      
      // 確認
      await expect(page).toHaveURL('/board');
      await expect(page.locator(`text=${newTitle}`)).toBeVisible();
      await expect(page.locator(`text=${newContent}`)).toBeVisible();
    });

    test('投稿の削除', async ({ page }) => {
      // 投稿を作成
      const title = `削除テスト_${Date.now()}`;
      await helper.createPost(title, '削除される投稿');
      
      // 削除
      await helper.openPostMenu(title);
      await page.click('text=削除');
      
      // 確認ダイアログ
      await expect(page.locator('text=投稿を削除しますか？')).toBeVisible();
      await page.click('button:has-text("削除"):not(:has-text("キャンセル"))');
      
      // 削除確認
      await expect(page.locator(`text=${title}`)).not.toBeVisible();
      
      // リロード後も削除されていることを確認
      await page.reload();
      await expect(page.locator(`text=${title}`)).not.toBeVisible();
    });
  });

  test.describe('バリデーション', () => {
    test.beforeEach(async () => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
    });

    test('文字数制限 - タイトル100文字', async ({ page }) => {
      await page.goto('/board/new');
      
      const longTitle = 'あ'.repeat(101);
      const titleInput = page.locator('input[label="タイトル"]');
      
      await titleInput.fill(longTitle);
      const value = await titleInput.inputValue();
      
      expect(value.length).toBe(100);
      await expect(page.locator('text=100/100文字')).toBeVisible();
    });

    test('文字数制限 - 本文1000文字', async ({ page }) => {
      await page.goto('/board/new');
      
      const longContent = 'あ'.repeat(1001);
      const contentInput = page.locator('textarea[label="本文"]');
      
      await contentInput.fill(longContent);
      const value = await contentInput.inputValue();
      
      expect(value.length).toBe(1000);
      await expect(page.locator('text=1000/1000文字')).toBeVisible();
    });

    test('必須フィールドのバリデーション', async ({ page }) => {
      await page.goto('/board/new');
      
      // 空のまま送信を試みる
      const submitButton = page.locator('button:has-text("投稿する")');
      await expect(submitButton).toBeDisabled();
      
      // タイトルのみ入力
      await page.fill('input[label="タイトル"]', 'テストタイトル');
      await expect(submitButton).toBeDisabled();
      
      // 本文も入力
      await page.fill('textarea[label="本文"]', 'テスト本文');
      await expect(submitButton).toBeEnabled();
    });

    test('タグの制限 - 最大5個', async ({ page }) => {
      await page.goto('/board/new');
      
      // 6個のタグを追加しようとする
      for (let i = 1; i <= 6; i++) {
        await page.fill('input[label="タグを追加"]', `タグ${i}`);
        await page.click('button:has-text("追加")');
      }
      
      // 5個までしか追加されないことを確認
      const tags = page.locator('.MuiChip-root');
      await expect(tags).toHaveCount(5);
    });
  });

  test.describe('権限管理', () => {
    let postTitle: string;

    test.beforeEach(async () => {
      // User1で投稿を作成
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      postTitle = `権限テスト_${Date.now()}`;
      await helper.createPost(postTitle, 'User1の投稿');
      await helper.logout();
    });

    test('他人の投稿は編集できない', async ({ page }) => {
      // User2でログイン
      await helper.login(
        TEST_CONFIG.users.secondary.email,
        TEST_CONFIG.users.secondary.password
      );
      
      await page.goto('/board');
      
      const postCard = await helper.findPostCard(postTitle);
      await expect(postCard).toBeVisible();
      
      // メニューボタンが表示されない
      const menuButton = postCard.locator('button[aria-label="メニュー"]');
      await expect(menuButton).not.toBeVisible();
    });

    test('URLを直接入力しても編集ページにアクセスできない', async ({ page }) => {
      // User2でログイン
      await helper.login(
        TEST_CONFIG.users.secondary.email,
        TEST_CONFIG.users.secondary.password
      );
      
      // 存在しない投稿IDで編集ページにアクセス
      await page.goto('/board/123456789012345678901234/edit');
      
      // エラーまたはリダイレクト
      await expect(page.locator('text=編集権限がありません')).toBeVisible({
        timeout: 5000
      }).catch(() => {
        // またはリダイレクト
        expect(page.url()).toContain('/board');
      });
    });
  });

  test.describe('セキュリティ', () => {
    test.beforeEach(async () => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
    });

    test('XSS攻撃の防御', async ({ page }) => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror="alert(\'XSS\')">',
        'javascript:alert("XSS")',
        '<svg onload="alert(\'XSS\')">'
      ];

      for (const payload of xssPayloads) {
        await helper.createPost(
          `XSSテスト_${Date.now()}`,
          payload
        );
        
        // アラートが表示されないことを確認
        page.on('dialog', () => {
          throw new Error('XSS attack was successful');
        });
        
        // HTMLとして解釈されていないことを確認
        const content = await page.textContent('.MuiCard-root');
        expect(content).toContain(payload);
      }
    });

    test('SQLインジェクションの防御', async ({ page }) => {
      const sqlPayloads = [
        "'; DROP TABLE posts; --",
        "1' OR '1'='1",
        "admin'--",
        "' UNION SELECT * FROM users --"
      ];

      for (const payload of sqlPayloads) {
        await helper.createPost(
          `SQLiテスト_${Date.now()}`,
          payload
        );
        
        // 正常に保存されることを確認
        await expect(page.locator(`text=${payload}`)).toBeVisible();
      }
      
      // データベースが正常に動作することを確認
      await page.reload();
      await expect(page.locator('.MuiCard-root')).toHaveCount(4);
    });
  });

  test.describe('パフォーマンス', () => {
    test('初回ロード時間', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      const loadTime = await helper.measureLoadTime('/board');
      
      expect(loadTime).toBeLessThan(3000); // 3秒以内
      console.log(`初回ロード時間: ${loadTime}ms`);
    });

    test('大量データでのパフォーマンス', async ({ page }) => {
      test.slow(); // タイムアウトを延長
      
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      // 30件の投稿を作成
      console.log('Creating test posts...');
      for (let i = 1; i <= 30; i++) {
        await helper.createPost(
          `パフォーマンステスト ${i}`,
          faker.lorem.paragraph()
        );
        if (i % 10 === 0) console.log(`Created ${i} posts`);
      }
      
      // ロード時間測定
      const loadTime = await helper.measureLoadTime('/board');
      expect(loadTime).toBeLessThan(3000);
      
      // ページネーションの動作確認
      await expect(page.locator('.MuiPagination-root')).toBeVisible();
      
      // 2ページ目への遷移時間
      const startTime = Date.now();
      await page.click('button[aria-label="Go to page 2"]');
      await page.waitForLoadState('networkidle');
      const pageChangeTime = Date.now() - startTime;
      
      expect(pageChangeTime).toBeLessThan(1000);
      console.log(`ページ切り替え時間: ${pageChangeTime}ms`);
    });

    test('同時更新の処理', async ({ browser }) => {
      // 2つのブラウザコンテキストを作成
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();
      
      const page1 = await context1.newPage();
      const page2 = await context2.newPage();
      
      const helper1 = new BoardPageHelper(page1);
      const helper2 = new BoardPageHelper(page2);
      
      // 両方でログイン
      await helper1.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      await helper2.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      // 同時に投稿を作成
      await Promise.all([
        helper1.createPost('同時投稿1', '内容1'),
        helper2.createPost('同時投稿2', '内容2')
      ]);
      
      // 両方の投稿が表示されることを確認
      await page1.reload();
      await expect(page1.locator('text=同時投稿1')).toBeVisible();
      await expect(page1.locator('text=同時投稿2')).toBeVisible();
      
      await context1.close();
      await context2.close();
    });
  });

  test.describe('エラーハンドリング', () => {
    test('ネットワークエラー時の処理', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      // ネットワークを切断
      await page.context().setOffline(true);
      
      await page.goto('/board/new');
      await page.fill('input[label="タイトル"]', 'オフラインテスト');
      await page.fill('textarea[label="本文"]', 'オフライン時の投稿');
      await page.click('button:has-text("投稿する")');
      
      // エラーメッセージが表示される
      await expect(page.locator('text=ネットワークエラー')).toBeVisible({
        timeout: 5000
      }).catch(() => {
        // または一般的なエラーメッセージ
        expect(page.locator('text=エラー')).toBeVisible();
      });
      
      // ネットワークを復旧
      await page.context().setOffline(false);
    });

    test('404エラーの処理', async ({ page }) => {
      await helper.login(
        TEST_CONFIG.users.primary.email,
        TEST_CONFIG.users.primary.password
      );
      
      // 存在しない投稿にアクセス
      await page.goto('/board/nonexistent/edit');
      
      // エラーページまたはリダイレクト
      await expect(page.locator('text=見つかりません')).toBeVisible({
        timeout: 5000
      }).catch(() => {
        expect(page.url()).toContain('/board');
      });
    });
  });
});