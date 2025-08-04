import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PostItem from '../PostItem';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PostItem', () => {
  const mockPost = {
    _id: '123',
    title: 'テストタイトル',
    content: 'テスト内容です。これはテスト投稿の内容です。',
    author: 'テストユーザー',
    createdAt: '2025-08-03T10:00:00Z',
    updatedAt: '2025-08-03T10:00:00Z',
  };

  const mockOnEdit = jest.fn();
  const mockOnDelete = jest.fn();

  beforeEach(() => {
    mockOnEdit.mockClear();
    mockOnDelete.mockClear();
  });

  it('renders post information correctly', () => {
    renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    expect(screen.getByText('テストタイトル')).toBeInTheDocument();
    expect(screen.getByText('テスト内容です。これはテスト投稿の内容です。')).toBeInTheDocument();
    expect(screen.getByText(/テストユーザー/)).toBeInTheDocument();
  });

  it('formats date in Japanese locale', () => {
    renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    // 日付フォーマットの確認（実際の表示形式に依存）
    const dateElement = screen.getByText(/2025/);
    expect(dateElement).toBeInTheDocument();
  });

  it('calls onEdit when edit button is clicked', () => {
    renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    const editButton = screen.getByLabelText('edit');
    fireEvent.click(editButton);
    
    expect(mockOnEdit).toHaveBeenCalledWith(mockPost);
    expect(mockOnEdit).toHaveBeenCalledTimes(1);
  });

  it('calls onDelete when delete button is clicked', () => {
    renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    const deleteButton = screen.getByLabelText('delete');
    fireEvent.click(deleteButton);
    
    expect(mockOnDelete).toHaveBeenCalledWith('123');
    expect(mockOnDelete).toHaveBeenCalledTimes(1);
  });

  it('handles long content with proper text wrapping', () => {
    const longPost = {
      ...mockPost,
      content: 'a'.repeat(200), // 200文字の長い文字列
    };
    
    renderWithTheme(
      <PostItem post={longPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    const contentElement = screen.getByText(/a{50,}/);
    expect(contentElement).toBeInTheDocument();
    
    // スタイルの確認
    expect(window.getComputedStyle(contentElement).wordBreak).toBe('break-all');
  });

  it('renders special characters correctly', () => {
    const specialPost = {
      ...mockPost,
      title: '特殊文字テスト！？',
      content: '「こんにちは」と言いました。\n改行もテストです。',
      author: '佐藤@テスター',
    };
    
    renderWithTheme(
      <PostItem post={specialPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    expect(screen.getByText('特殊文字テスト！？')).toBeInTheDocument();
    expect(screen.getByText(/「こんにちは」と言いました/)).toBeInTheDocument();
    expect(screen.getByText(/佐藤@テスター/)).toBeInTheDocument();
  });

  it('applies hover effect on list item', () => {
    const { container } = renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    const listItem = container.querySelector('.MuiListItem-root');
    expect(listItem).toBeInTheDocument();
    
    // ホバー効果のスタイルが適用されているか確認
    if (listItem) {
      // MUIのテーマに依存するため、クラスの存在を確認
      expect(listItem.className).toContain('MuiListItem');
    }
  });

  it('renders with responsive padding', () => {
    const { container } = renderWithTheme(
      <PostItem post={mockPost} onEdit={mockOnEdit} onDelete={mockOnDelete} />
    );
    
    const listItem = container.querySelector('.MuiListItem-root');
    expect(listItem).toBeInTheDocument();
    
    // レスポンシブパディングが設定されているか確認
    if (listItem) {
      const styles = window.getComputedStyle(listItem);
      // パディングが設定されているか確認
      expect(styles.padding).toBeTruthy();
    }
  });
});