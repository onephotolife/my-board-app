import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';

import VerifyEmailPage from '@/app/auth/verify-email/page';

const mockPush = jest.fn();
const mockGet = jest.fn();

describe('VerifyEmailPage - Unit Tests', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    mockPush.mockClear();
    mockGet.mockClear();
    
    // ルーターのモックを更新
    const useRouterMock = useRouter as jest.Mock;
    useRouterMock.mockImplementation(() => ({
      push: mockPush,
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
    }));
    
    // fetchのモック
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('トークンがない場合、エラーメッセージが表示される', async () => {
      // SearchParamsのモック（トークンなし）
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue(null),
      }));

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/無効なリンクです/)).toBeInTheDocument();
      });
    });

    it('有効なトークンがある場合、ローディング状態が表示される', async () => {
      // SearchParamsのモック（トークンあり）
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('test-token-123'),
      }));

      render(<VerifyEmailPage />);

      // ローディング状態の確認
      expect(screen.getByText('メールアドレスを確認中...')).toBeInTheDocument();
    });
  });

  describe('API通信', () => {
    it('認証成功時、成功メッセージが表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('valid-token'),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'メールアドレスの確認が完了しました',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('メールアドレスが確認されました')).toBeInTheDocument();
        expect(screen.getByText(/メールアドレスの確認が完了しました/)).toBeInTheDocument();
      });

      // 3秒後にリダイレクト
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin?verified=true');
      }, { timeout: 4000 });
    });

    it('既に確認済みの場合、適切なメッセージが表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('valid-token'),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'このメールアドレスは既に確認済みです',
          type: 'ALREADY_VERIFIED',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('既に確認済みです')).toBeInTheDocument();
        expect(screen.getByText(/このメールアドレスは既に確認済みです/)).toBeInTheDocument();
      });
    });

    it('トークンが無効な場合、エラーメッセージが表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('invalid-token'),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: '無効なトークンです',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/無効なトークンです/)).toBeInTheDocument();
      });
    });

    it('トークンが期限切れの場合、適切なエラーメッセージが表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('expired-token'),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          success: false,
          error: 'トークンの有効期限が切れています',
          type: 'TOKEN_EXPIRED',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('有効期限切れ')).toBeInTheDocument();
        expect(screen.getByText(/トークンの有効期限が切れています/)).toBeInTheDocument();
      });
    });

    it('ネットワークエラーの場合、適切なエラーメッセージが表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('test-token'),
      }));

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/ネットワークエラーが発生しました/)).toBeInTheDocument();
      });
    });
  });

  describe('UIコンポーネント', () => {
    it('エラー時に新規登録とログインボタンが表示される', async () => {
      // SearchParamsのモック（トークンなし）
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue(null),
      }));

      render(<VerifyEmailPage />);

      await waitFor(() => {
        const signupButton = screen.getByRole('button', { name: /新規登録へ/ });
        const signinButton = screen.getByRole('button', { name: /ログインへ/ });
        expect(signupButton).toBeInTheDocument();
        expect(signinButton).toBeInTheDocument();
      });
    });

    it('成功時にリダイレクト通知が表示される', async () => {
      // SearchParamsのモック
      const useSearchParamsMock = useSearchParams as jest.Mock;
      useSearchParamsMock.mockImplementation(() => ({
        get: mockGet.mockReturnValue('valid-token'),
      }));

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          success: true,
          message: 'メールアドレスの確認が完了しました',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText(/3秒後にログインページへリダイレクトします/)).toBeInTheDocument();
      });
    });
  });
});