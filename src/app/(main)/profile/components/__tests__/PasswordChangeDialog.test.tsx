import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordChangeDialog from '../PasswordChangeDialog';

// バリデーション関数のモック
jest.mock('@/lib/validations/profile', () => ({
  validatePassword: jest.fn((password) => {
    if (!password) {
      return { isValid: false, error: '新しいパスワードを入力してください' };
    }
    if (password.length < 8) {
      return { isValid: false, error: 'パスワードは8文字以上である必要があります' };
    }
    return { isValid: true, error: null };
  }),
  validatePasswordConfirm: jest.fn((password, confirm) => {
    if (!confirm) {
      return { isValid: false, error: '確認用パスワードを入力してください' };
    }
    if (password !== confirm) {
      return { isValid: false, error: 'パスワードが一致しません' };
    }
    return { isValid: true, error: null };
  }),
}));

describe('PasswordChangeDialog', () => {
  const mockOnClose = jest.fn();
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Test 1: ダイアログが正しくレンダリングされることを確認
  it('ダイアログが開いた時に正しくレンダリングされる', () => {
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('パスワード変更')).toBeInTheDocument();
    expect(screen.getByLabelText('現在のパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード')).toBeInTheDocument();
    expect(screen.getByLabelText('新しいパスワード（確認）')).toBeInTheDocument();
    expect(screen.getByText('キャンセル')).toBeInTheDocument();
    expect(screen.getByText('変更する')).toBeInTheDocument();
  });

  // Test 2: ダイアログが閉じられることを確認
  it('ダイアログが閉じた時に表示されない', () => {
    const { rerender } = render(
      <PasswordChangeDialog
        open={false}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.queryByText('パスワード変更')).not.toBeInTheDocument();

    rerender(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    expect(screen.getByText('パスワード変更')).toBeInTheDocument();
  });

  // Test 3: フォーム入力が正しく動作することを確認
  it('フォームフィールドに入力できる', async () => {
    const user = userEvent.setup();
    
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const currentPasswordInput = screen.getByLabelText('現在のパスワード');
    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）');

    await user.type(currentPasswordInput, 'currentPass123');
    await user.type(newPasswordInput, 'newPass123!');
    await user.type(confirmPasswordInput, 'newPass123!');

    expect(currentPasswordInput).toHaveValue('currentPass123');
    expect(newPasswordInput).toHaveValue('newPass123!');
    expect(confirmPasswordInput).toHaveValue('newPass123!');
  });

  // Test 4: パスワード表示/非表示の切り替えが動作することを確認
  it('パスワードの表示/非表示を切り替えられる', async () => {
    const user = userEvent.setup();
    
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const currentPasswordInput = screen.getByLabelText('現在のパスワード');
    
    // 初期状態はパスワードタイプ
    expect(currentPasswordInput).toHaveAttribute('type', 'password');

    // 表示ボタンをクリック
    const toggleButtons = screen.getAllByRole('button', { name: /パスワードを表示/ });
    await user.click(toggleButtons[0]);

    // テキストタイプに変更される
    expect(currentPasswordInput).toHaveAttribute('type', 'text');

    // 再度クリックで非表示に
    const hideButtons = screen.getAllByRole('button', { name: /パスワードを隠す/ });
    await user.click(hideButtons[0]);
    
    expect(currentPasswordInput).toHaveAttribute('type', 'password');
  });

  // Test 5: バリデーションエラーが表示されることを確認
  it('バリデーションエラーが正しく表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const submitButton = screen.getByText('変更する');
    
    // 何も入力せずに送信
    await user.click(submitButton);

    // エラーメッセージが表示される
    await waitFor(() => {
      expect(screen.getByText('現在のパスワードを入力してください')).toBeInTheDocument();
    });
  });

  // Test 6: パスワード不一致エラーが表示されることを確認
  it('パスワード不一致エラーが表示される', async () => {
    const user = userEvent.setup();
    
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）');

    await user.type(newPasswordInput, 'password123');
    await user.type(confirmPasswordInput, 'password456');

    // 確認パスワードフィールドを離れる
    await user.tab();

    await waitFor(() => {
      expect(screen.getByText('パスワードが一致しません')).toBeInTheDocument();
    });
  });

  // Test 7: 成功時の処理が正しく動作することを確認
  it('パスワード変更に成功した場合の処理', async () => {
    const user = userEvent.setup();
    
    mockOnSubmit.mockResolvedValue({
      success: true,
      message: 'パスワードを変更しました',
    });

    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const currentPasswordInput = screen.getByLabelText('現在のパスワード');
    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）');
    const submitButton = screen.getByText('変更する');

    await user.type(currentPasswordInput, 'currentPass123');
    await user.type(newPasswordInput, 'newPass123!');
    await user.type(confirmPasswordInput, 'newPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith({
        currentPassword: 'currentPass123',
        newPassword: 'newPass123!',
        confirmPassword: 'newPass123!',
      });
      expect(screen.getByText('パスワードを変更しました')).toBeInTheDocument();
    });

    // 2秒後にダイアログが閉じる
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    }, { timeout: 3000 });
  });

  // Test 8: エラー時の処理が正しく動作することを確認
  it('パスワード変更に失敗した場合の処理', async () => {
    const user = userEvent.setup();
    
    mockOnSubmit.mockResolvedValue({
      success: false,
      message: '現在のパスワードが正しくありません',
    });

    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const currentPasswordInput = screen.getByLabelText('現在のパスワード');
    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）');
    const submitButton = screen.getByText('変更する');

    await user.type(currentPasswordInput, 'wrongPass123');
    await user.type(newPasswordInput, 'newPass123!');
    await user.type(confirmPasswordInput, 'newPass123!');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('現在のパスワードが正しくありません')).toBeInTheDocument();
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // Test 9: キャンセルボタンが正しく動作することを確認
  it('キャンセルボタンでダイアログが閉じる', async () => {
    const user = userEvent.setup();
    
    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const cancelButton = screen.getByText('キャンセル');
    await user.click(cancelButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  // Test 10: 送信中は操作が無効化されることを確認
  it('送信中はフォームが無効化される', async () => {
    const user = userEvent.setup();
    
    // 遅延のあるPromiseを返す
    mockOnSubmit.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 1000))
    );

    render(
      <PasswordChangeDialog
        open={true}
        onClose={mockOnClose}
        onSubmit={mockOnSubmit}
      />
    );

    const currentPasswordInput = screen.getByLabelText('現在のパスワード');
    const newPasswordInput = screen.getByLabelText('新しいパスワード');
    const confirmPasswordInput = screen.getByLabelText('新しいパスワード（確認）');
    const submitButton = screen.getByText('変更する');
    const cancelButton = screen.getByText('キャンセル');

    await user.type(currentPasswordInput, 'currentPass123');
    await user.type(newPasswordInput, 'newPass123!');
    await user.type(confirmPasswordInput, 'newPass123!');
    await user.click(submitButton);

    // 送信中は無効化される
    expect(currentPasswordInput).toBeDisabled();
    expect(newPasswordInput).toBeDisabled();
    expect(confirmPasswordInput).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
  });
});