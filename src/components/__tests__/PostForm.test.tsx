import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PostForm from '../PostForm';
import { ThemeProvider, createTheme } from '@mui/material/styles';

const theme = createTheme();

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <ThemeProvider theme={theme}>
      {component}
    </ThemeProvider>
  );
};

describe('PostForm', () => {
  const mockOnSubmit = jest.fn();

  beforeEach(() => {
    mockOnSubmit.mockClear();
  });

  it('renders all input fields and submit button', () => {
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/タイトル/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/投稿者名/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/投稿内容/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /投稿する/i })).toBeInTheDocument();
  });

  it('displays character count for each field', () => {
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('0/100文字')).toBeInTheDocument();
    expect(screen.getByText('0/50文字')).toBeInTheDocument();
    expect(screen.getByText('0/200文字')).toBeInTheDocument();
  });

  it('updates character count when typing', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    const titleInput = screen.getByLabelText(/タイトル/i);
    await user.type(titleInput, 'テスト');
    
    expect(screen.getByText('3/100文字')).toBeInTheDocument();
  });

  it('disables submit button when fields are empty', () => {
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    const submitButton = screen.getByRole('button', { name: /投稿する/i });
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when all fields are filled', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/タイトル/i), 'テストタイトル');
    await user.type(screen.getByLabelText(/投稿者名/i), 'テストユーザー');
    await user.type(screen.getByLabelText(/投稿内容/i), 'テスト内容');
    
    const submitButton = screen.getByRole('button', { name: /投稿する/i });
    expect(submitButton).toBeEnabled();
  });

  it('calls onSubmit with correct data when form is submitted', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/タイトル/i), 'テストタイトル');
    await user.type(screen.getByLabelText(/投稿者名/i), 'テストユーザー');
    await user.type(screen.getByLabelText(/投稿内容/i), 'テスト内容');
    
    const submitButton = screen.getByRole('button', { name: /投稿する/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        'テストタイトル',
        'テスト内容',
        'テストユーザー'
      );
    });
  });

  it('clears form after successful submission', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    const titleInput = screen.getByLabelText(/タイトル/i) as HTMLInputElement;
    const authorInput = screen.getByLabelText(/投稿者名/i) as HTMLInputElement;
    const contentInput = screen.getByLabelText(/投稿内容/i) as HTMLInputElement;
    
    await user.type(titleInput, 'テストタイトル');
    await user.type(authorInput, 'テストユーザー');
    await user.type(contentInput, 'テスト内容');
    
    const submitButton = screen.getByRole('button', { name: /投稿する/i });
    await user.click(submitButton);
    
    await waitFor(() => {
      expect(titleInput.value).toBe('');
      expect(authorInput.value).toBe('');
      expect(contentInput.value).toBe('');
    });
  });

  it('prevents input beyond maximum character limit', async () => {
    const user = userEvent.setup();
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    const contentInput = screen.getByLabelText(/投稿内容/i) as HTMLInputElement;
    const longText = 'あ'.repeat(201); // 201文字
    
    await user.type(contentInput, longText);
    
    // maxLength属性により200文字で制限される
    expect(contentInput.value.length).toBeLessThanOrEqual(200);
  });

  it('disables submit button while submitting', async () => {
    const user = userEvent.setup();
    let resolveSubmit: () => void;
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve;
    });
    mockOnSubmit.mockReturnValue(submitPromise);
    
    renderWithTheme(<PostForm onSubmit={mockOnSubmit} />);
    
    await user.type(screen.getByLabelText(/タイトル/i), 'テスト');
    await user.type(screen.getByLabelText(/投稿者名/i), 'テスト');
    await user.type(screen.getByLabelText(/投稿内容/i), 'テスト');
    
    const submitButton = screen.getByRole('button', { name: /投稿する/i });
    await user.click(submitButton);
    
    expect(submitButton).toBeDisabled();
    
    resolveSubmit!();
    await waitFor(() => {
      expect(submitButton).toBeEnabled();
    });
  });
});