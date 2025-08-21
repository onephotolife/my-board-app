import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { useRouter, useSearchParams } from 'next/navigation';

import VerifyEmailPage from '@/app/auth/verify-email/page';

// モックの設定
jest.mock('next/navigation');

const mockPush = jest.fn();
const mockGet = jest.fn();

describe('VerifyEmailPage - Unit Tests', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
    
    // ルーターのモック
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    
    // fetchのモック
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('初期表示', () => {
    it('トークンがない場合、エラーメッセージが表示される', async () => {
      // SearchParamsのモック（トークンなし）
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue(null),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/無効なリンクです/)).toBeInTheDocument();
      });
    });

    it('有効なトークンがある場合、ローディング状態が表示される', () => {
      // SearchParamsのモック（トークンあり）
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('test-token-123'),
      });

      render(<VerifyEmailPage />);

      expect(screen.getByText('メールアドレスを確認中...')).toBeInTheDocument();
      expect(screen.getByText('しばらくお待ちください')).toBeInTheDocument();
    });
  });

  describe('API通信', () => {
    it('認証成功時、成功メッセージが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('valid-token'),
      });

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
        expect(screen.getByText('確認完了！')).toBeInTheDocument();
        expect(screen.getByText(/メールアドレスの確認が完了しました/)).toBeInTheDocument();
      });

      // リダイレクトが3秒後に実行される
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith('/auth/signin?verified=true');
      }, { timeout: 4000 });
    });

    it('既に確認済みの場合、適切なメッセージが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('valid-token'),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          alreadyVerified: true,
          message: 'メールアドレスは既に確認済みです',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('確認完了！')).toBeInTheDocument();
        expect(screen.getByText(/既に確認済みです/)).toBeInTheDocument();
      });
    });

    it('トークンが無効な場合、エラーメッセージが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('invalid-token'),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: 'トークンが無効です',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/トークンが無効です/)).toBeInTheDocument();
      });
    });

    it('トークンが期限切れの場合、適切なエラーメッセージが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('expired-token'),
      });

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          error: '確認リンクの有効期限が切れています',
        }),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/有効期限が切れています/)).toBeInTheDocument();
      });
    });

    it('ネットワークエラーの場合、適切なエラーメッセージが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('test-token'),
      });

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText(/ネットワークエラー/)).toBeInTheDocument();
      });
    });
  });

  describe('UIコンポーネント', () => {
    it('エラー時に新規登録とログインボタンが表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue(null),
      });

      render(<VerifyEmailPage />);

      await waitFor(() => {
        expect(screen.getByText('新規登録へ')).toBeInTheDocument();
        expect(screen.getByText('ログインへ')).toBeInTheDocument();
      });
    });

    it('成功時にリダイレクト通知が表示される', async () => {
      (useSearchParams as jest.Mock).mockReturnValue({
        get: mockGet.mockReturnValue('valid-token'),
      });

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
        expect(screen.getByText(/まもなくログインページへ移動します/)).toBeInTheDocument();
      });
    });
  });
});