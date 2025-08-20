import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import ClientHeader from '@/components/ClientHeader';
import { useRouter, usePathname } from 'next/navigation';

// モックの設定
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
  usePathname: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('ナビゲーション統合テスト', () => {
  const mockPush = jest.fn();
  
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    (usePathname as jest.Mock).mockReturnValue('/');
    jest.clearAllMocks();
  });

  describe('ヘッダーとDrawerの統合', () => {
    test('ハンバーガーメニューボタンをクリックするとDrawerが開く', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      render(
        <SessionProvider session={null}>
          <ClientHeader />
        </SessionProvider>
      );

      // 初期状態ではDrawerのコンテンツが表示されていない
      expect(screen.queryByText('メニュー')).not.toBeInTheDocument();

      // ハンバーガーメニューボタンをクリック
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // Drawerが開いてメニューが表示される
      await waitFor(() => {
        expect(screen.getByText('メニュー')).toBeInTheDocument();
        expect(screen.getByText('ホーム')).toBeInTheDocument();
      });
    });

    test('ログイン状態でDrawerにダッシュボードメニューが表示される', async () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // ハンバーガーメニューを開く
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // ダッシュボードメニューが表示される
      await waitFor(() => {
        expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
        expect(screen.getByText('掲示板')).toBeInTheDocument();
        expect(screen.getByText('プロフィール')).toBeInTheDocument();
      });
    });

    test('Drawerからダッシュボードに遷移できる', async () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // ハンバーガーメニューを開く
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // ダッシュボードメニューをクリック
      await waitFor(() => {
        const dashboardButton = screen.getByText('ダッシュボード');
        fireEvent.click(dashboardButton);
      });

      // ダッシュボードページに遷移することを確認
      expect(mockPush).toHaveBeenCalledWith('/dashboard');
    });

    test('Drawer背景をクリックするとDrawerが閉じる', async () => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });

      const { container } = render(
        <SessionProvider session={null}>
          <ClientHeader />
        </SessionProvider>
      );

      // ハンバーガーメニューを開く
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // Drawerが開いている
      await waitFor(() => {
        expect(screen.getByText('メニュー')).toBeInTheDocument();
      });

      // Backdrop（背景）をクリック
      const backdrop = container.querySelector('.MuiBackdrop-root');
      if (backdrop) {
        fireEvent.click(backdrop);
      }

      // Drawerが閉じる
      await waitFor(() => {
        expect(screen.queryByText('メニュー')).not.toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブデザインの統合テスト', () => {
    test('デスクトップサイズでダッシュボードボタンが表示される', () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      // デスクトップサイズのビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // ダッシュボードボタンが存在する（デスクトップ表示）
      const dashboardButtons = screen.getAllByRole('link', { name: /ダッシュボード/i });
      expect(dashboardButtons.length).toBeGreaterThan(0);
    });

    test('モバイルサイズでダッシュボードアイコンボタンが表示される', () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      // モバイルサイズのビューポートをシミュレート
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // ダッシュボードアイコンボタンが存在する
      const dashboardIconButton = screen.getByLabelText('ダッシュボード');
      expect(dashboardIconButton).toBeInTheDocument();
    });
  });

  describe('ナビゲーションフローの統合テスト', () => {
    test('ログイン → ダッシュボード → 掲示板の遷移フロー', async () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // 1. ハンバーガーメニューを開く
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // 2. ダッシュボードに遷移
      await waitFor(() => {
        const dashboardButton = screen.getByText('ダッシュボード');
        fireEvent.click(dashboardButton);
      });
      expect(mockPush).toHaveBeenCalledWith('/dashboard');

      // 3. 再度メニューを開いて掲示板に遷移
      fireEvent.click(menuButton);
      await waitFor(() => {
        const boardButton = screen.getByText('掲示板');
        fireEvent.click(boardButton);
      });
      expect(mockPush).toHaveBeenCalledWith('/board');
    });

    test('ログアウトフローの動作確認', async () => {
      const mockSession = {
        user: {
          name: 'Test User',
          email: 'test@example.com',
        },
      };

      const { useSession, signOut } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });
      signOut.mockResolvedValue(undefined);

      render(
        <SessionProvider session={mockSession}>
          <ClientHeader />
        </SessionProvider>
      );

      // ハンバーガーメニューを開く
      const menuButton = screen.getByLabelText('メニューを開く');
      fireEvent.click(menuButton);

      // ログアウトボタンをクリック
      await waitFor(() => {
        const logoutButton = screen.getByText('ログアウト');
        fireEvent.click(logoutButton);
      });

      // signOutが呼ばれてホームページに遷移
      await waitFor(() => {
        expect(signOut).toHaveBeenCalledWith({ redirect: false });
        expect(mockPush).toHaveBeenCalledWith('/');
      });
    });
  });
});