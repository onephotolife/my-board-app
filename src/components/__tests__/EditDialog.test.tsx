import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import EditDialog from '../EditDialog';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('EditDialog', () => {
  const mockPost = {
    _id: '123',
    title: 'テストタイトル',
    content: '元の投稿内容',
    author: 'テストユーザー',
    createdAt: '2025-08-03T10:00:00Z',
    updatedAt: '2025-08-03T10:00:00Z',
  };

  const mockOnClose = jest.fn();
  const mockOnUpdate = jest.fn();

  beforeEach(() => {
    mockOnClose.mockClear();
    mockOnUpdate.mockClear();
  });

  it('renders dialog when open is true', () => {
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.getByText('投稿を編集')).toBeInTheDocument();
    expect(screen.getByDisplayValue('元の投稿内容')).toBeInTheDocument();
  });

  it('does not render dialog when open is false', () => {
    renderWithTheme(
      <EditDialog
        open={false}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.queryByText('投稿を編集')).not.toBeInTheDocument();
  });

  it('handles null post gracefully', () => {
    renderWithTheme(
      <EditDialog
        open={true}
        post={null}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.getByText('投稿を編集')).toBeInTheDocument();
    const textField = screen.getByRole('textbox') as HTMLInputElement;
    expect(textField.value).toBe('');
  });

  it('displays character count', () => {
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.getByText('7/200文字')).toBeInTheDocument();
  });

  it('updates character count when typing', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const textField = screen.getByRole('textbox');
    await user.clear(textField);
    await user.type(textField, '新しい内容');
    
    expect(screen.getByText('5/200文字')).toBeInTheDocument();
  });

  it('calls onClose when cancel button is clicked', () => {
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    fireEvent.click(cancelButton);
    
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnUpdate).not.toHaveBeenCalled();
  });

  it('calls onUpdate with new content when update button is clicked', async () => {
    const user = userEvent.setup();
    mockOnUpdate.mockResolvedValue(undefined);
    
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const textField = screen.getByRole('textbox');
    await user.clear(textField);
    await user.type(textField, '更新された内容');
    
    const updateButton = screen.getByRole('button', { name: /更新/i });
    await user.click(updateButton);
    
    await waitFor(() => {
      expect(mockOnUpdate).toHaveBeenCalledWith('更新された内容');
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it('disables update button when content is empty', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const textField = screen.getByRole('textbox');
    await user.clear(textField);
    
    const updateButton = screen.getByRole('button', { name: /更新/i });
    expect(updateButton).toBeDisabled();
  });

  it('disables buttons while updating', async () => {
    const user = userEvent.setup();
    let resolveUpdate: () => void;
    const updatePromise = new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    });
    mockOnUpdate.mockReturnValue(updatePromise);
    
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const updateButton = screen.getByRole('button', { name: /更新/i });
    const cancelButton = screen.getByRole('button', { name: /キャンセル/i });
    
    await user.click(updateButton);
    
    expect(updateButton).toBeDisabled();
    expect(cancelButton).toBeDisabled();
    
    resolveUpdate!();
    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  it('prevents input beyond maximum character limit', async () => {
    const user = userEvent.setup();
    renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    const textField = screen.getByRole('textbox') as HTMLInputElement;
    await user.clear(textField);
    const longText = 'あ'.repeat(201); // 201文字
    
    await user.type(textField, longText);
    
    // maxLength属性により200文字で制限される
    expect(textField.value.length).toBeLessThanOrEqual(200);
  });

  it('preserves post content when reopening dialog', () => {
    const { rerender } = renderWithTheme(
      <EditDialog
        open={true}
        post={mockPost}
        onClose={mockOnClose}
        onUpdate={mockOnUpdate}
      />
    );
    
    expect(screen.getByDisplayValue('元の投稿内容')).toBeInTheDocument();
    
    // ダイアログを閉じる
    rerender(
      <ThemeProvider theme={theme}>
        <EditDialog
          open={false}
          post={mockPost}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      </ThemeProvider>
    );
    
    // ダイアログを再度開く
    rerender(
      <ThemeProvider theme={theme}>
        <EditDialog
          open={true}
          post={mockPost}
          onClose={mockOnClose}
          onUpdate={mockOnUpdate}
        />
      </ThemeProvider>
    );
    
    expect(screen.getByDisplayValue('元の投稿内容')).toBeInTheDocument();
  });
});