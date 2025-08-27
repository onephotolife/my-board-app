import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import FollowButton from '@/components/FollowButton';

// CSRFProvider のモック
jest.mock('@/components/CSRFProvider', () => ({
  useSecureFetch: () => {
    return jest.fn((url: string, options: RequestInit) => {
      // モックレスポンスを返す
      if (url.includes('404-user')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          statusText: 'Not Found',
          url: url,
          json: () => Promise.reject(new Error('Not Found'))
        });
      }
      
      return Promise.resolve({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ 
          data: { isFollowing: true } 
        })
      });
    });
  }
}));

describe('FollowButton Component - Improved Error Handling', () => {
  const consoleSpy = {
    error: jest.spyOn(console, 'error').mockImplementation(),
    warn: jest.spyOn(console, 'warn').mockImplementation(),
    log: jest.spyOn(console, 'log').mockImplementation()
  };
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  afterAll(() => {
    consoleSpy.error.mockRestore();
    consoleSpy.warn.mockRestore();
    consoleSpy.log.mockRestore();
  });
  
  describe('正常系テスト', () => {
    test('フォローボタンが正しくレンダリングされる', () => {
      render(
        <FollowButton 
          userId="test-user-123"
          initialFollowing={false}
        />
      );
      
      const button = screen.getByRole('button');
      expect(button).toHaveTextContent('フォロー');
      expect(button).toBeEnabled();
    });
    
    test('フォロー状態が切り替わる', async () => {
      const mockOnFollowChange = jest.fn();
      
      render(
        <FollowButton 
          userId="test-user-123"
          initialFollowing={false}
          onFollowChange={mockOnFollowChange}
        />
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(button).toHaveTextContent('フォロー中');
        expect(mockOnFollowChange).toHaveBeenCalledWith(true);
      });
    });
  });
  
  describe('エラーハンドリング改善テスト', () => {
    test('404エラー時に改善されたエラーログが出力される', async () => {
      // 404エラーを返すモック
      const mockSecureFetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        url: '/api/follow/404-user',
        json: () => Promise.reject(new Error('Not Found'))
      }));
      
      jest.spyOn(require('@/components/CSRFProvider'), 'useSecureFetch').mockReturnValue(mockSecureFetch);
      
      render(
        <FollowButton 
          userId="404-user"
          initialFollowing={false}
        />
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      await waitFor(() => {
        // 改善されたエラーログの確認
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Follow API Error:',
          expect.objectContaining({
            status: 404,
            statusText: 'Not Found',
            url: '/api/follow/404-user',
            method: 'POST',
            userId: '404-user',
            timestamp: expect.any(String)
          })
        );
        
        // 404の特別処理ログ
        expect(consoleSpy.warn).toHaveBeenCalledWith(
          '404 detected - checking API availability'
        );
      });
      
      // エラーメッセージの表示確認
      await waitFor(() => {
        const errorMessage = screen.getByText(/APIエンドポイントが見つかりません/);
        expect(errorMessage).toBeInTheDocument();
      });
    });
    
    test('ネットワークエラー時に詳細なエラーログが出力される', async () => {
      const mockSecureFetch = jest.fn(() => 
        Promise.reject(new Error('Network error'))
      );
      
      jest.spyOn(require('@/components/CSRFProvider'), 'useSecureFetch').mockReturnValue(mockSecureFetch);
      
      render(
        <FollowButton 
          userId="test-user"
          initialFollowing={false}
        />
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      await waitFor(() => {
        expect(consoleSpy.error).toHaveBeenCalledWith(
          'Follow toggle error:',
          expect.objectContaining({
            error: expect.any(Error),
            userId: 'test-user',
            isFollowing: false,
            timestamp: expect.any(String)
          })
        );
      });
      
      // エラーメッセージの表示確認
      await waitFor(() => {
        const errorMessage = screen.getByText('ネットワークエラーが発生しました');
        expect(errorMessage).toBeInTheDocument();
      });
    });
    
    test('response.json()のエラーが適切に処理される', async () => {
      const mockSecureFetch = jest.fn(() => Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        url: '/api/follow/test',
        json: () => Promise.reject(new Error('Invalid JSON'))
      }));
      
      jest.spyOn(require('@/components/CSRFProvider'), 'useSecureFetch').mockReturnValue(mockSecureFetch);
      
      render(
        <FollowButton 
          userId="test"
          initialFollowing={false}
        />
      );
      
      const button = screen.getByRole('button');
      await userEvent.click(button);
      
      await waitFor(() => {
        // response.json()のエラーがキャッチされ、空オブジェクトが使用される
        const errorMessage = screen.getByText(/エラーが発生しました \(500\)/);
        expect(errorMessage).toBeInTheDocument();
      });
    });
  });
  
  describe('改善されたユーザー体験', () => {
    test('各HTTPステータスコードに対して適切なメッセージが表示される', async () => {
      const testCases = [
        { status: 401, message: 'ログインが必要です' },
        { status: 404, message: 'APIエンドポイントが見つかりません' },
        { status: 409, message: '既にフォローしています' },
        { status: 500, message: 'エラーが発生しました (500)' }
      ];
      
      for (const testCase of testCases) {
        const mockSecureFetch = jest.fn(() => Promise.resolve({
          ok: false,
          status: testCase.status,
          statusText: 'Error',
          url: '/api/follow/test',
          json: () => Promise.resolve({})
        }));
        
        jest.spyOn(require('@/components/CSRFProvider'), 'useSecureFetch').mockReturnValue(mockSecureFetch);
        
        const { unmount } = render(
          <FollowButton 
            userId="test"
            initialFollowing={false}
          />
        );
        
        const button = screen.getByRole('button');
        await userEvent.click(button);
        
        await waitFor(() => {
          const errorMessage = screen.getByText(new RegExp(testCase.message));
          expect(errorMessage).toBeInTheDocument();
        });
        
        unmount();
      }
    });
  });
});