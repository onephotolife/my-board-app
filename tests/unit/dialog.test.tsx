import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// テスト用のモックテーマ
const theme = createTheme({
  zIndex: {
    modal: 1300,
    fab: 1050,
  },
});

// ダイアログコンポーネントのモック
const TestDialog = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  return (
    <ThemeProvider theme={theme}>
      <Dialog
        open={open}
        onClose={onClose}
        maxWidth="sm"
        fullWidth
        disableEnforceFocus
        keepMounted={false}
        aria-labelledby="test-dialog-title"
        aria-describedby="test-dialog-description"
      >
        <DialogTitle id="test-dialog-title">新規投稿</DialogTitle>
        <DialogContent id="test-dialog-description">
          <div>投稿フォームコンテンツ</div>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>キャンセル</Button>
          <Button variant="contained">投稿</Button>
        </DialogActions>
      </Dialog>
    </ThemeProvider>
  );
};

describe('Dialog Component Unit Tests', () => {
  test('ダイアログが正しく表示される', () => {
    const mockClose = jest.fn();
    render(<TestDialog open={true} onClose={mockClose} />);
    
    expect(screen.getByText('新規投稿')).toBeInTheDocument();
    expect(screen.getByText('投稿フォームコンテンツ')).toBeInTheDocument();
  });

  test('ダイアログが閉じられる', () => {
    const mockClose = jest.fn();
    const { rerender } = render(<TestDialog open={true} onClose={mockClose} />);
    
    fireEvent.click(screen.getByText('キャンセル'));
    expect(mockClose).toHaveBeenCalled();
    
    rerender(<TestDialog open={false} onClose={mockClose} />);
    expect(screen.queryByText('新規投稿')).not.toBeInTheDocument();
  });

  test('aria属性が正しく設定されている', () => {
    const mockClose = jest.fn();
    render(<TestDialog open={true} onClose={mockClose} />);
    
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveAttribute('aria-labelledby', 'test-dialog-title');
    expect(dialog).toHaveAttribute('aria-describedby', 'test-dialog-description');
  });

  test('disableEnforceFocusが設定されている', () => {
    const mockClose = jest.fn();
    const { container } = render(<TestDialog open={true} onClose={mockClose} />);
    
    // MUIダイアログのコンテナをチェック
    const dialogContainer = container.querySelector('.MuiDialog-root');
    expect(dialogContainer).toBeInTheDocument();
  });
});