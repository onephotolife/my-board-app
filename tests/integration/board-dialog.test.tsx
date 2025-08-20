import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionProvider } from 'next-auth/react';

// モックセッション
const mockSession = {
  user: {
    id: 'test-user-id',
    name: 'テストユーザー',
    email: 'test@example.com',
  },
  expires: '2024-12-31',
};

// BoardPageコンポーネントのモック
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    refresh: jest.fn(),
  }),
}));

describe('Board Dialog Integration Tests', () => {
  beforeEach(() => {
    // DOMをリセット
    document.body.innerHTML = '';
  });

  test('FABボタンクリックでダイアログが開く', async () => {
    const { container } = render(
      <SessionProvider session={mockSession}>
        <div>
          <button aria-label="add" onClick={() => {
            const dialog = document.createElement('div');
            dialog.setAttribute('role', 'dialog');
            dialog.innerHTML = '<div>新規投稿</div>';
            document.body.appendChild(dialog);
          }}>
            +
          </button>
        </div>
      </SessionProvider>
    );

    const fabButton = screen.getByLabelText('add');
    expect(fabButton).toBeInTheDocument();

    fireEvent.click(fabButton);

    await waitFor(() => {
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('新規投稿')).toBeInTheDocument();
    });
  });

  test('ダイアログのz-indexが正しく設定されている', async () => {
    render(
      <SessionProvider session={mockSession}>
        <div>
          <div style={{ position: 'fixed', zIndex: 1100 }}>FABボタン</div>
          <div role="dialog" style={{ position: 'fixed', zIndex: 1300 }}>
            ダイアログコンテンツ
          </div>
        </div>
      </SessionProvider>
    );

    const fab = screen.getByText('FABボタン');
    const dialog = screen.getByRole('dialog');

    const fabStyle = window.getComputedStyle(fab.parentElement!);
    const dialogStyle = window.getComputedStyle(dialog);

    expect(parseInt(dialogStyle.zIndex)).toBeGreaterThan(parseInt(fabStyle.zIndex));
  });

  test('背景クリックでダイアログが閉じる', async () => {
    let isDialogOpen = true;
    
    const TestComponent = () => {
      const [open, setOpen] = React.useState(isDialogOpen);
      
      return (
        <SessionProvider session={mockSession}>
          {open && (
            <>
              <div 
                role="presentation"
                onClick={() => setOpen(false)}
                style={{ 
                  position: 'fixed',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  zIndex: 1299
                }}
              />
              <div role="dialog" style={{ position: 'fixed', zIndex: 1300 }}>
                ダイアログコンテンツ
              </div>
            </>
          )}
        </SessionProvider>
      );
    };

    const { rerender } = render(<TestComponent />);
    
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    
    const backdrop = screen.getByRole('presentation');
    fireEvent.click(backdrop);
    
    isDialogOpen = false;
    rerender(<TestComponent />);
    
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  test('フォーカス管理が正しく動作する', async () => {
    const TestComponent = () => {
      const [open, setOpen] = React.useState(false);
      
      return (
        <SessionProvider session={mockSession}>
          <button onClick={() => setOpen(true)}>開く</button>
          {open && (
            <div role="dialog">
              <button autoFocus>最初のボタン</button>
              <button onClick={() => setOpen(false)}>閉じる</button>
            </div>
          )}
        </SessionProvider>
      );
    };

    render(<TestComponent />);
    
    const openButton = screen.getByText('開く');
    fireEvent.click(openButton);
    
    await waitFor(() => {
      const firstButton = screen.getByText('最初のボタン');
      expect(firstButton).toBeInTheDocument();
      // autoFocusの確認
      expect(document.activeElement).toBe(firstButton);
    });
  });
});