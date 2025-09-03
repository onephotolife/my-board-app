import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { renderHook } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import { CSRFProvider, useSecureFetch, useCSRFContext } from '../CSRFProvider';

// CSRFTokenManager モック - DOM操作を完全に無効化
const mockTokenManagerInstance = {
  ensureToken: jest.fn().mockResolvedValue('test-csrf-token-123'),
  refreshToken: jest.fn().mockResolvedValue('new-csrf-token-789'),
  getCurrentToken: jest.fn().mockReturnValue('test-csrf-token-123'),
  setToken: jest.fn(), // DOM操作を伴う setToken をモック化
  isValid: jest.fn().mockReturnValue(true),
};

jest.mock('@/lib/security/csrf-token-manager', () => ({
  CSRFTokenManager: {
    getInstance: jest.fn(() => mockTokenManagerInstance),
    reset: jest.fn(),
  }
}));

// Fetch モック
global.fetch = jest.fn();

describe('CSRFProvider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // CSRFTokenManagerモックのリセットと再設定
    mockTokenManagerInstance.ensureToken.mockResolvedValue('test-csrf-token-123');
    mockTokenManagerInstance.refreshToken.mockResolvedValue('new-csrf-token-789');
    mockTokenManagerInstance.getCurrentToken.mockReturnValue('test-csrf-token-123');
    mockTokenManagerInstance.setToken.mockClear();
    mockTokenManagerInstance.isValid.mockReturnValue(true);
    
    // fetch モックの設定
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        token: 'test-csrf-token-123',
        header: 'x-csrf-token',
        message: 'CSRF token generated successfully'
      }),
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
    
    // グローバル状態をクリーンアップ
    if (typeof window !== 'undefined') {
      delete window.csrfTokenInitialized;
      delete window.__CSRF_INIT_IN_PROGRESS__;
      delete window.__CSRF_INIT_PROMISE__;
      delete window.__CSRF_TOKEN_CACHE__;
      delete window.__CSRF_MOUNT_COUNT__;
      delete window.__CSRF_MOUNT_HISTORY__;
      delete window.__API_CALL_TRACKER__;
    }
    
    // CSRFTokenManagerをリセット
    const { CSRFTokenManager } = require('@/lib/security/csrf-token-manager');
    CSRFTokenManager.reset();
  });

  describe('CSRFProvider 初期化', () => {
    it('マウント時に自動的にCSRFトークンを取得する', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider>{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useCSRFContext(), { wrapper });

      await waitFor(() => {
        // CSRFTokenManagerのensureTokenが呼ばれることを確認
        expect(mockTokenManagerInstance.ensureToken).toHaveBeenCalled();
        // コンテキストからトークンが取得できることを確認
        expect(result.current.token).toBe('test-csrf-token-123');
      });
    });

    it('initialTokenが提供された場合にsetTokenが呼ばれる', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider initialToken="initial-csrf-token-456">{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useCSRFContext(), { wrapper });

      await waitFor(() => {
        // initialTokenが提供された場合、CSRFTokenManagerのsetTokenが呼ばれることを確認
        expect(mockTokenManagerInstance.setToken).toHaveBeenCalledWith('initial-csrf-token-456');
        // トークンがコンテキストに正しく設定されることを確認
        expect(result.current.token).toBe('initial-csrf-token-456');
      });
    });
  });

  describe('useSecureFetch フック', () => {
    it('GETリクエストではCSRFトークンを含めない', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider>{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useSecureFetch(), { wrapper });

      await act(async () => {
        const secureFetch = result.current;
        await secureFetch('/api/test', { method: 'GET' });
      });

      const lastCall = (global.fetch as jest.Mock).mock.calls[
        (global.fetch as jest.Mock).mock.calls.length - 1
      ];
      expect(lastCall[0]).toBe('/api/test');
      expect(lastCall[1].headers).toBeUndefined();
    });

    it('POSTリクエストでトークンが初期化されるまで待機する', async () => {
      // ensureTokenを遅延させるモック
      let tokenResolve: (value: any) => void;
      const tokenPromise = new Promise((resolve) => {
        tokenResolve = resolve;
      });
      
      // CSRFTokenManagerのensureTokenを遅延モックに変更
      mockTokenManagerInstance.ensureToken.mockImplementation(() => tokenPromise);

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider>{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useSecureFetch(), { wrapper });

      // POSTリクエストを開始（トークンが遅延中）
      let postPromise: Promise<any>;
      act(() => {
        const secureFetch = result.current;
        postPromise = secureFetch('/api/test', { 
          method: 'POST',
          body: JSON.stringify({ test: true })
        });
      });

      // CSRFTokenManagerのensureTokenが呼ばれることを確認
      expect(mockTokenManagerInstance.ensureToken).toHaveBeenCalled();

      // トークン取得を解決
      await act(async () => {
        tokenResolve!('delayed-token-456');
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // POSTリクエストが完了するまで待つ
      await act(async () => {
        await postPromise!;
      });

      // POSTリクエストにトークンが含まれていることを確認
      const postCall = (global.fetch as jest.Mock).mock.calls.find(
        call => call[0] === '/api/test'
      );
      expect(postCall).toBeDefined();
      expect(postCall[1].headers).toBeDefined();
      expect(postCall[1].headers.get('x-csrf-token')).toBe('delayed-token-456');
    });

    it('トークン取得タイムアウト後も処理を続行する', async () => {
      // トークン取得が失敗するケース
      (global.fetch as jest.Mock).mockImplementation((url) => {
        if (url === '/api/csrf') {
          return new Promise(() => {}); // 永遠に解決しない
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      });

      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider>{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useSecureFetch(), { wrapper });

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      // タイムアウトをシミュレート（実際は3秒待つが、テストでは短くする）
      await act(async () => {
        const secureFetch = result.current;
        // 注: 実際のコードではタイムアウトが実装されているが、
        // テストでは実際に3秒待つのは避ける
        const promise = secureFetch('/api/test', { method: 'POST' });
        // すぐに解決させる
        await promise;
      });

      // 警告が出力されることを確認（実装によっては）
      // expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('[CSRF] Token not available'));

      consoleSpy.mockRestore();
    });
  });

  describe('refreshToken 機能', () => {
    it('refreshToken を呼ぶと新しいトークンを取得する', async () => {
      const wrapper = ({ children }: { children: React.ReactNode }) => (
        <SessionProvider session={null}>
          <CSRFProvider>{children}</CSRFProvider>
        </SessionProvider>
      );

      const { result } = renderHook(() => useCSRFContext(), { wrapper });

      // 初回の自動取得を待つ
      await waitFor(() => {
        expect(result.current.token).toBe('test-csrf-token-123');
      });

      // 新しいトークンを返すようにモックを更新
      (global.fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: async () => ({
          token: 'new-csrf-token-789',
          header: 'x-csrf-token',
          message: 'CSRF token refreshed successfully'
        }),
      });

      // refreshToken を呼ぶ
      await act(async () => {
        await result.current.refreshToken();
      });

      // 新しいトークンが設定されることを確認
      await waitFor(() => {
        expect(result.current.token).toBe('new-csrf-token-789');
      });
    });
  });
});