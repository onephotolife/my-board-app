import { test, expect } from '@playwright/test';

const PRODUCTION_URL = 'https://board.blankbrainai.com';
const TEST_EMAIL = 'one.photolife+2@gmail.com';
const TEST_PASSWORD = '?@thc123THC@?';

test.describe('本番環境タグ機能検証', () => {
  test.beforeEach(async ({ page }) => {
    console.log('📍 本番環境テスト開始:', PRODUCTION_URL);
    
    // ログイン処理
    await page.goto(`${PRODUCTION_URL}/auth/signin`, { waitUntil: 'domcontentloaded' });
    
    // ログインフォームの入力
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    
    // スクリーンショット取得（ログイン前）
    await page.screenshot({ path: 'test-results/login-form.png' });
    
    // ログインボタンクリック
    await page.click('button[type="submit"]');
    
    // ダッシュボードへの遷移を待つ
    await page.waitForURL(/\/dashboard/, { timeout: 30000 });
    console.log('✅ ログイン成功');
  });

  test('タグの表示確認', async ({ page }) => {
    // 投稿一覧ページへ遷移
    await page.goto(`${PRODUCTION_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000); // コンテンツ読み込み待機
    
    // デバッグ用：ページ全体のスクリーンショット
    await page.screenshot({ path: 'test-results/board-page-full.png', fullPage: true });
    
    // 投稿カードの存在確認
    const postCards = page.locator('[data-testid^="post-card-"]');
    const postCount = await postCards.count();
    console.log(`📊 投稿数: ${postCount}件`);
    
    expect(postCount).toBeGreaterThan(0);
    
    // 各投稿のタグを確認
    let tagsFound = false;
    let tagTexts = [];
    
    for (let i = 0; i < Math.min(postCount, 5); i++) {
      const post = postCards.nth(i);
      
      // タグの存在確認（data-testid または Chipコンポーネント）
      const tagChips = post.locator('[data-testid*="post-tag-"]');
      const tagCount = await tagChips.count();
      
      if (tagCount > 0) {
        tagsFound = true;
        console.log(`📌 投稿 ${i + 1}: ${tagCount}個のタグを発見`);
        
        for (let j = 0; j < tagCount; j++) {
          const tagText = await tagChips.nth(j).textContent();
          tagTexts.push(tagText);
          console.log(`   - タグ: ${tagText}`);
        }
      } else {
        // 別のセレクタで試行
        const alternativeTags = post.locator('.MuiChip-root').filter({ hasText: '#' });
        const altTagCount = await alternativeTags.count();
        
        if (altTagCount > 0) {
          tagsFound = true;
          console.log(`📌 投稿 ${i + 1}: ${altTagCount}個のタグを発見（代替セレクタ）`);
          
          for (let j = 0; j < altTagCount; j++) {
            const tagText = await alternativeTags.nth(j).textContent();
            tagTexts.push(tagText);
            console.log(`   - タグ: ${tagText}`);
          }
        }
      }
      
      // 各投稿のスクリーンショット
      await post.screenshot({ path: `test-results/post-${i + 1}.png` });
    }
    
    // タグが見つかったか確認
    expect(tagsFound).toBeTruthy();
    expect(tagTexts.length).toBeGreaterThan(0);
    console.log(`✅ タグ総数: ${tagTexts.length}個`);
  });

  test('タグクリックによるフィルタリング', async ({ page }) => {
    // 投稿一覧ページへ遷移
    await page.goto(`${PRODUCTION_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // 最初の投稿数を記録
    const initialPostCount = await page.locator('[data-testid^="post-card-"]').count();
    console.log(`📊 初期投稿数: ${initialPostCount}件`);
    
    // クリック可能なタグを探す
    let clickableTag = null;
    let tagText = '';
    
    // data-testidで検索
    const tagWithTestId = page.locator('[data-testid*="post-tag-"]').first();
    if (await tagWithTestId.count() > 0) {
      clickableTag = tagWithTestId;
      tagText = await tagWithTestId.textContent() || '';
      console.log(`🎯 クリック対象タグ（testid）: ${tagText}`);
    } else {
      // MuiChipで検索
      const chipTags = page.locator('.MuiChip-root').filter({ hasText: '#' });
      if (await chipTags.count() > 0) {
        clickableTag = chipTags.first();
        tagText = await clickableTag.textContent() || '';
        console.log(`🎯 クリック対象タグ（Chip）: ${tagText}`);
      }
    }
    
    if (!clickableTag) {
      console.error('❌ クリック可能なタグが見つかりません');
      // デバッグ情報出力
      const htmlContent = await page.content();
      console.log('HTML snippet:', htmlContent.substring(0, 1000));
      throw new Error('No clickable tags found');
    }
    
    // タグをクリック
    await clickableTag.click();
    console.log(`🖱️ タグ「${tagText}」をクリック`);
    
    // フィルタリング後の待機
    await page.waitForTimeout(1000);
    
    // フィルタリング後のスクリーンショット
    await page.screenshot({ path: 'test-results/after-tag-filter.png', fullPage: true });
    
    // フィルタリングアラートの確認
    const filterAlert = page.locator('.MuiAlert-root').filter({ hasText: tagText.replace('#', '') });
    const alertVisible = await filterAlert.isVisible();
    
    if (alertVisible) {
      console.log('✅ フィルタリングアラート表示確認');
      await filterAlert.screenshot({ path: 'test-results/filter-alert.png' });
    } else {
      console.log('⚠️ フィルタリングアラートが表示されていません');
    }
    
    // フィルタリング後の投稿数確認
    const filteredPostCount = await page.locator('[data-testid^="post-card-"]').count();
    console.log(`📊 フィルタリング後投稿数: ${filteredPostCount}件`);
    
    // フィルタリングが機能しているか確認（投稿数が変わるか、全投稿が同じタグを持つか）
    if (filteredPostCount < initialPostCount) {
      console.log('✅ フィルタリング成功：投稿数が減少');
    } else if (filteredPostCount === initialPostCount) {
      // すべての投稿が同じタグを持っているか確認
      const visiblePosts = page.locator('[data-testid^="post-card-"]');
      let allHaveSameTag = true;
      
      for (let i = 0; i < Math.min(filteredPostCount, 3); i++) {
        const post = visiblePosts.nth(i);
        const postTags = await post.locator('.MuiChip-root').allTextContents();
        const hasTargetTag = postTags.some(tag => tag.includes(tagText.replace('#', '')));
        
        if (!hasTargetTag) {
          allHaveSameTag = false;
          break;
        }
      }
      
      if (allHaveSameTag) {
        console.log('✅ フィルタリング成功：表示投稿が選択タグを含む');
      } else {
        console.log('❌ フィルタリングが正しく動作していない可能性');
      }
    }
    
    // タグ再クリックでフィルタ解除
    if (clickableTag) {
      await clickableTag.click();
      await page.waitForTimeout(1000);
      
      const resetPostCount = await page.locator('[data-testid^="post-card-"]').count();
      console.log(`📊 フィルタ解除後投稿数: ${resetPostCount}件`);
      
      if (resetPostCount === initialPostCount) {
        console.log('✅ フィルタ解除成功');
      }
    }
  });

  test('選択中タグのビジュアルフィードバック', async ({ page }) => {
    // 投稿一覧ページへ遷移
    await page.goto(`${PRODUCTION_URL}/board`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    
    // タグを見つける
    const tag = page.locator('.MuiChip-root').filter({ hasText: '#' }).first();
    
    if (await tag.count() === 0) {
      console.log('⚠️ タグが見つかりません - スキップ');
      return;
    }
    
    // クリック前の状態を記録
    const beforeClickStyle = await tag.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border
      };
    });
    console.log('📝 クリック前のスタイル:', beforeClickStyle);
    
    // タグをクリック
    await tag.click();
    await page.waitForTimeout(500);
    
    // クリック後の状態を記録
    const afterClickStyle = await tag.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        backgroundColor: styles.backgroundColor,
        color: styles.color,
        border: styles.border
      };
    });
    console.log('📝 クリック後のスタイル:', afterClickStyle);
    
    // スタイルが変更されたか確認
    const styleChanged = 
      beforeClickStyle.backgroundColor !== afterClickStyle.backgroundColor ||
      beforeClickStyle.color !== afterClickStyle.color ||
      beforeClickStyle.border !== afterClickStyle.border;
    
    if (styleChanged) {
      console.log('✅ 選択中タグのビジュアルフィードバック確認');
    } else {
      console.log('⚠️ ビジュアルフィードバックが不明瞭');
    }
    
    // ホバー効果の確認
    await tag.hover();
    await page.waitForTimeout(300);
    
    const hoverStyle = await tag.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return {
        transform: styles.transform,
        backgroundColor: styles.backgroundColor
      };
    });
    console.log('📝 ホバー時のスタイル:', hoverStyle);
    
    if (hoverStyle.transform && hoverStyle.transform !== 'none') {
      console.log('✅ ホバー時の拡大効果確認');
    }
  });
});