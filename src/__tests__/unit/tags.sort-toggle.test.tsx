/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
/**
 * 単体テスト（認証済み前提の仕様検証：実行はしない）
 * 目的: /tags/[tag] の人気順トグル操作が fetch に sort=-likes を付与することを確認
 * 備考: 実行は後続承認後。ここでは雛形とデバッグログのみ。
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// next/link をモック（単純な a タグに置換）
jest.mock('next/link', () => ({
  __esModule: true,
  default: (props: any) => React.createElement('a', props),
}));

// Portal フォールバックを無効化（テスト簡略化）
process.env.NEXT_PUBLIC_DISABLE_TAG_PORTAL_FALLBACK = 'true';

// 対象コンポーネント
import TagDetailClient from '@/app/tags/[tag]/TagDetailClient';

describe('TagDetailClient sort toggle (unit)', () => {
  test('人気順トグルで sort=-likes を付与して fetch する', async () => {
    const calls: string[] = [];
    const originalFetch = global.fetch;
    global.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push(url);
      // デバッグ出力
      // eslint-disable-next-line no-console
      console.log('[UNIT-DEBUG] fetch called:', url);
      return new Response(
        JSON.stringify({
          success: true,
          data: [],
          pagination: { page: 1, limit: 20, hasNext: false },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    render(<TagDetailClient tagKey="東京" initial={{ posts: [], hasNext: false }} />);

    // トグルが表示されること
    const toggle = await screen.findByTestId('tag-sort-toggle');
    expect(toggle).toBeInTheDocument();

    // 「人気順」ボタン（アクセシブル名は英語のaria-label）をクリック
    const popularBtn = screen.getByRole('button', { name: /popular posts/i });
    fireEvent.click(popularBtn);

    await waitFor(() => {
      // 直近の fetch 呼び出しに sort=-likes が含まれること
      const hit = calls.some((u) => u.includes('/api/posts') && u.includes('sort=-likes'));
      expect(hit).toBe(true);
    });

    global.fetch = originalFetch as any;
  });
});
