import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SessionProvider } from 'next-auth/react';
import ProfilePage from '../page';
import { UserProvider } from '@/contexts/UserContext';

// Next.js router モック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
  usePathname: () => '/profile',
}));

// NextAuth モック
jest.mock('next-auth/react', () => ({
  ...jest.requireActual('next-auth/react'),
  useSession: () => ({
    data: {
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
      },
    },
    status: 'authenticated',
    update: jest.fn(),
  }),
  signOut: jest.fn(),
}));

// UserContext モック
jest.mock('@/contexts/UserContext', () => {
  const originalModule = jest.requireActual('@/contexts/UserContext');
  return {
    ...originalModule,
    useUser: () => ({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'これはテスト用の自己紹介です',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      },
      loading: false,
      error: null,
      updateProfile: jest.fn().mockResolvedValue({ success: true, message: 'プロフィールを更新しました' }),
      changePassword: jest.fn(),
      refreshUser: jest.fn(),
      clearError: jest.fn(),
    }),
  };
});

describe('Profile Page Integration Tests', () => {
  // Test 1: プロフィールページが正しくレンダリングされる
  it('プロフィールページが正しく表示される', () => {
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    expect(screen.getByText('プロフィール')).toBeInTheDocument();
    expect(screen.getByText('アカウント情報の確認と編集')).toBeInTheDocument();
    expect(screen.getByText('基本情報')).toBeInTheDocument();
    expect(screen.getByText('セキュリティ')).toBeInTheDocument();
    expect(screen.getByText('アカウント情報')).toBeInTheDocument();
  });

  // Test 2: ユーザー情報が正しく表示される
  it('ユーザー情報が正しく表示される', () => {
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    const nameInput = screen.getByDisplayValue('Test User');
    const emailInput = screen.getByDisplayValue('test@example.com');
    const bioInput = screen.getByDisplayValue('これはテスト用の自己紹介です');

    expect(nameInput).toBeInTheDocument();
    expect(emailInput).toBeInTheDocument();
    expect(bioInput).toBeInTheDocument();
  });

  // Test 3: 編集モードの切り替えが動作する
  it('編集モードの切り替えが正しく動作する', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    const editButton = screen.getByRole('button', { name: /編集/i });
    
    // 初期状態では編集不可
    const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;
    expect(nameInput).toBeDisabled();

    // 編集ボタンをクリック
    await user.click(editButton);

    // 編集可能になる
    expect(nameInput).not.toBeDisabled();
    
    // 保存とキャンセルボタンが表示される
    expect(screen.getByRole('button', { name: /保存/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /キャンセル/i })).toBeInTheDocument();
  });

  // Test 4: プロフィール編集が動作する
  it('プロフィールの編集と保存が動作する', async () => {
    const user = userEvent.setup();
    const mockUpdateProfile = jest.fn().mockResolvedValue({ 
      success: true, 
      message: 'プロフィールを更新しました' 
    });

    // UserContextをモック
    jest.spyOn(require('@/contexts/UserContext'), 'useUser').mockReturnValue({
      user: {
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        bio: 'これはテスト用の自己紹介です',
      },
      loading: false,
      error: null,
      updateProfile: mockUpdateProfile,
      changePassword: jest.fn(),
      refreshUser: jest.fn(),
      clearError: jest.fn(),
    });

    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    // 編集モードに切り替え
    const editButton = screen.getByRole('button', { name: /編集/i });
    await user.click(editButton);

    // 名前を変更
    const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, '新しい名前');

    // 自己紹介を変更
    const bioInput = screen.getByDisplayValue('これはテスト用の自己紹介です') as HTMLTextAreaElement;
    await user.clear(bioInput);
    await user.type(bioInput, '新しい自己紹介です');

    // 保存ボタンをクリック
    const saveButton = screen.getByRole('button', { name: /保存/i });
    await user.click(saveButton);

    // updateProfileが呼ばれることを確認
    await waitFor(() => {
      expect(mockUpdateProfile).toHaveBeenCalledWith({
        name: '新しい名前',
        bio: '新しい自己紹介です',
      });
    });
  });

  // Test 5: パスワード変更ダイアログが開く
  it('パスワード変更ボタンでダイアログが開く', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    const passwordButton = screen.getByRole('button', { name: /パスワード変更/i });
    await user.click(passwordButton);

    // ダイアログが表示される
    await waitFor(() => {
      expect(screen.getByText('パスワード変更')).toBeInTheDocument();
      expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument();
      expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
      expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument();
    });
  });

  // Test 6: キャンセルボタンで編集内容が破棄される
  it('キャンセルボタンで編集内容が破棄される', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    // 編集モードに切り替え
    const editButton = screen.getByRole('button', { name: /編集/i });
    await user.click(editButton);

    // 名前を変更
    const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;
    await user.clear(nameInput);
    await user.type(nameInput, '変更された名前');

    // キャンセルボタンをクリック
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    await user.click(cancelButton);

    // 元の値に戻る
    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('変更された名前')).not.toBeInTheDocument();
  });

  // Test 7: バリデーションエラーが表示される
  it('名前が空の場合にエラーが表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    // 編集モードに切り替え
    const editButton = screen.getByRole('button', { name: /編集/i });
    await user.click(editButton);

    // 名前を空にする
    const nameInput = screen.getByDisplayValue('Test User') as HTMLInputElement;
    await user.clear(nameInput);

    // フィールドからフォーカスを外す
    await user.tab();

    // エラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('名前は必須です')).toBeInTheDocument();
    });

    // 保存ボタンが無効化される
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });

  // Test 8: 自己紹介の文字数制限が機能する
  it('自己紹介の文字数制限が表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    // 編集モードに切り替え
    const editButton = screen.getByRole('button', { name: /編集/i });
    await user.click(editButton);

    // 自己紹介を変更
    const bioInput = screen.getByDisplayValue('これはテスト用の自己紹介です') as HTMLTextAreaElement;
    await user.clear(bioInput);
    
    const longText = 'あ'.repeat(150);
    await user.type(bioInput, longText);

    // 文字数カウンターが表示される
    expect(screen.getByText('150/200')).toBeInTheDocument();
  });

  // Test 9: 200文字を超える自己紹介でエラーが表示される
  it('自己紹介が200文字を超えるとエラーが表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <SessionProvider session={null}>
        <UserProvider>
          <ProfilePage />
        </UserProvider>
      </SessionProvider>
    );

    // 編集モードに切り替え
    const editButton = screen.getByRole('button', { name: /編集/i });
    await user.click(editButton);

    // 自己紹介を変更
    const bioInput = screen.getByDisplayValue('これはテスト用の自己紹介です') as HTMLTextAreaElement;
    await user.clear(bioInput);
    
    const longText = 'あ'.repeat(201);
    await user.type(bioInput, longText);

    // エラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('自己紹介は200文字以内で入力してください')).toBeInTheDocument();
    });

    // 保存ボタンが無効化される
    const saveButton = screen.getByRole('button', { name: /保存/i });
    expect(saveButton).toBeDisabled();
  });
});