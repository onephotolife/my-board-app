import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SessionProvider } from 'next-auth/react';
import MobileDrawer from '@/components/MobileDrawer';
import { useRouter } from 'next/navigation';

// Next.js のモック
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(),
  signOut: jest.fn(),
  SessionProvider: ({ children }: { children: React.ReactNode }) => children,
}));

describe('MobileDrawer コンポーネントのテスト', () => {
  const mockPush = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush,
    });
    jest.clearAllMocks();
  });

  describe('基本的な動作', () => {
    test('open=trueの時、Drawerが表示される', () => {
      render(
        <SessionProvider session={null}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      expect(screen.getByText('メニュー')).toBeInTheDocument();
      expect(screen.getByText('ホーム')).toBeInTheDocument();
    });

    test('open=falseの時、Drawerが表示されない', () => {
      const { container } = render(
        <SessionProvider session={null}>
          <MobileDrawer open={false} onClose={mockOnClose} />
        </SessionProvider>
      );

      const drawer = container.querySelector('.MuiDrawer-root');
      const paper = drawer?.querySelector('.MuiPaper-root');
      
      if (paper) {
        const style = window.getComputedStyle(paper);
        expect(style.visibility).toBe('hidden');
      }
    });

    test('閉じるボタンをクリックするとonCloseが呼ばれる', () => {
      render(
        <SessionProvider session={null}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      const closeButton = screen.getByLabelText('Close');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('未ログイン時の表示', () => {
    beforeEach(() => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: null,
        status: 'unauthenticated',
      });
    });

    test('未ログイン時に表示されるメニュー項目', () => {
      render(
        <SessionProvider session={null}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('ログイン')).toBeInTheDocument();
      expect(screen.queryByText('ダッシュボード')).not.toBeInTheDocument();
      expect(screen.queryByText('掲示板')).not.toBeInTheDocument();
      expect(screen.queryByText('プロフィール')).not.toBeInTheDocument();
    });

    test('ログインメニューをクリックすると正しいページに遷移', () => {
      render(
        <SessionProvider session={null}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      const loginButton = screen.getByText('ログイン');
      fireEvent.click(loginButton);

      expect(mockPush).toHaveBeenCalledWith('/auth/signin');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('ログイン時の表示', () => {
    const mockSession = {
      user: {
        name: 'Test User',
        email: 'test@example.com',
      },
    };

    beforeEach(() => {
      const { useSession } = require('next-auth/react');
      useSession.mockReturnValue({
        data: mockSession,
        status: 'authenticated',
      });
    });

    test('ログイン時に表示されるメニュー項目', () => {
      render(
        <SessionProvider session={mockSession}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      expect(screen.getByText('ホーム')).toBeInTheDocument();
      expect(screen.getByText('ダッシュボード')).toBeInTheDocument();
      expect(screen.getByText('掲示板')).toBeInTheDocument();
      expect(screen.getByText('プロフィール')).toBeInTheDocument();
      expect(screen.getByText('Test Userさん')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('ログアウト')).toBeInTheDocument();
    });

    test('各メニュー項目をクリックすると正しいページに遷移', () => {
      render(
        <SessionProvider session={mockSession}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      const menuItems = [
        { text: 'ホーム', path: '/' },
        { text: 'ダッシュボード', path: '/dashboard' },
        { text: '掲示板', path: '/board' },
        { text: 'プロフィール', path: '/profile' },
      ];

      menuItems.forEach(({ text, path }) => {
        const button = screen.getByText(text);
        fireEvent.click(button);
        expect(mockPush).toHaveBeenCalledWith(path);
        expect(mockOnClose).toHaveBeenCalled();
        jest.clearAllMocks();
      });
    });

    test('ログアウトボタンをクリックするとsignOutが呼ばれる', async () => {
      const { signOut } = require('next-auth/react');
      signOut.mockResolvedValue(undefined);

      render(
        <SessionProvider session={mockSession}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      const logoutButton = screen.getByText('ログアウト');
      fireEvent.click(logoutButton);

      await waitFor(() => {
        expect(signOut).toHaveBeenCalledWith({ redirect: false });
        expect(mockPush).toHaveBeenCalledWith('/');
        expect(mockOnClose).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Drawerの幅のテスト', () => {
    test('Drawerの幅が280pxに設定されている', () => {
      const { container } = render(
        <SessionProvider session={null}>
          <MobileDrawer open={true} onClose={mockOnClose} />
        </SessionProvider>
      );

      const drawerPaper = container.querySelector('.MuiDrawer-paper');
      expect(drawerPaper).toHaveStyle('width: 280px');
    });
  });
});