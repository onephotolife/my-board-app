import { act, waitFor } from '@testing-library/react';

/**
 * MUI特有のテストヘルパー
 * MUIアニメーションとReact 18の非同期レンダリングを適切に処理
 */

/**
 * MUIアニメーション完了待機
 * @param duration MUIアニメーション時間（デフォルト: 350ms）
 */
export const waitForMUIAnimation = async (duration: number = 350) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, duration));
  });
};

/**
 * Popoverの開閉待機
 * @param expectOpen true: 開いた状態を期待、false: 閉じた状態を期待
 */
export const waitForPopover = async (expectOpen: boolean, getElement: () => HTMLElement | null) => {
  await waitFor(
    async () => {
      const element = getElement();
      if (expectOpen) {
        expect(element).toBeInTheDocument();
      } else {
        expect(element).not.toBeInTheDocument();
      }
    },
    { timeout: 3000 }
  );
  
  // MUIアニメーション完了待機
  await waitForMUIAnimation();
};

/**
 * 非同期状態更新待機
 * React 18のautomatic batchingとMUIアニメーションを考慮
 */
export const waitForStateUpdate = async (callback: () => void | Promise<void>) => {
  await act(async () => {
    await callback();
  });
  
  // マイクロタスクキューのフラッシュ
  await act(async () => {
    await Promise.resolve();
  });
};

/**
 * ユーザーインタラクションシミュレーション
 * act()とMUIアニメーションを適切に処理
 */
export const userInteraction = async (
  interaction: () => void,
  options: { animationDelay?: number } = {}
) => {
  const { animationDelay = 350 } = options;
  
  await act(async () => {
    interaction();
  });
  
  if (animationDelay > 0) {
    await waitForMUIAnimation(animationDelay);
  }
};

/**
 * データフェッチのモック待機
 * fetchとsetStateの非同期処理を適切に処理
 */
export const waitForAsyncData = async (
  expectation: () => void,
  options: { timeout?: number } = {}
) => {
  const { timeout = 3000 } = options;
  
  await waitFor(
    async () => {
      await act(async () => {
        expectation();
      });
    },
    { timeout }
  );
};

/**
 * スクロールイベントのシミュレーション
 * act()でラップして状態更新を適切に処理
 */
export const simulateScroll = async (
  element: HTMLElement,
  scrollOptions: {
    scrollTop: number;
    scrollHeight: number;
    clientHeight: number;
  }
) => {
  await act(async () => {
    Object.defineProperty(element, 'scrollTop', {
      writable: true,
      value: scrollOptions.scrollTop
    });
    Object.defineProperty(element, 'scrollHeight', {
      writable: true,
      value: scrollOptions.scrollHeight
    });
    Object.defineProperty(element, 'clientHeight', {
      writable: true,
      value: scrollOptions.clientHeight
    });
    
    element.dispatchEvent(new Event('scroll', { bubbles: true }));
  });
  
  // スクロールハンドラの処理待機
  await waitForMUIAnimation(100);
};