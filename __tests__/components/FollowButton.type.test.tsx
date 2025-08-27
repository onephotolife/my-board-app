/**
 * FollowButton TypeScript型定義テスト
 * Purpose: SOL-005の型安全性を検証
 */

import React from 'react';
import { render } from '@testing-library/react';
import FollowButton from '@/components/FollowButton';
import { 
  FollowButtonPropsV1, 
  FollowButtonPropsV2,
  isV2Props,
  sanitizeButtonProps,
  convertToV2Props
} from '@/types/mui-extensions';

describe('FollowButton Type Safety Tests', () => {
  describe('型定義の検証', () => {
    test('必須プロパティuserIdがない場合はコンパイルエラー', () => {
      // @ts-expect-error - userIdは必須
      const invalidProps = {
        initialFollowing: false
      };
      
      // 型エラーが発生することを確認
      expect(() => {
        // @ts-expect-error
        render(<FollowButton {...invalidProps} />);
      }).not.toThrow(); // 実行時エラーではなくコンパイル時エラー
    });
    
    test('有効なpropsでレンダリング可能', () => {
      const validProps: FollowButtonPropsV1 = {
        userId: 'test-user-123',
        initialFollowing: false,
        size: 'medium',
        variant: 'contained',
        color: 'primary'
      };
      
      const { container } = render(<FollowButton {...validProps} />);
      expect(container.querySelector('button')).toBeInTheDocument();
    });
    
    test('不正なHTML属性が除外される', () => {
      const propsWithInvalidAttrs = {
        userId: 'test-user',
        button: 'invalid', // 不正な属性
        component: 'div',  // 不正な属性
        ref: React.createRef(), // 不正な属性
      };
      
      const { container } = render(
        // @ts-ignore - テストのため意図的に不正なprops
        <FollowButton {...propsWithInvalidAttrs} />
      );
      
      const button = container.querySelector('button');
      expect(button).not.toHaveAttribute('button');
      expect(button).not.toHaveAttribute('component');
    });
  });
  
  describe('sanitizeButtonProps ユーティリティ', () => {
    test('不正なpropsを正しく除外', () => {
      const dirtyProps = {
        userId: 'test',
        button: 'invalid',
        component: 'div',
        onClick: () => {},
        size: 'medium' as const,
        'data-testid': 'test-button',
        'aria-label': 'Follow button'
      };
      
      const sanitized = sanitizeButtonProps(dirtyProps);
      
      // 有効なpropsは保持
      expect(sanitized.size).toBe('medium');
      expect(sanitized['data-testid']).toBe('test-button');
      expect(sanitized['aria-label']).toBe('Follow button');
      
      // 不正なpropsは除外
      expect('button' in sanitized).toBe(false);
      expect('component' in sanitized).toBe(false);
      expect('onClick' in sanitized).toBe(false);
    });
  });
  
  describe('isV2Props 型ガード', () => {
    test('V2 propsを正しく識別', () => {
      const v2Props: FollowButtonPropsV2 = {
        userId: 'test',
        size: 'small',
        variant: 'outlined',
        color: 'primary',
        disabled: false,
        'data-testid': 'follow-btn'
      };
      
      expect(isV2Props(v2Props)).toBe(true);
    });
    
    test('無効なキーを含むpropsはV2として識別されない', () => {
      const invalidProps = {
        userId: 'test',
        button: 'invalid', // 無効なキー
        randomProp: 'value' // 定義されていないキー
      };
      
      expect(isV2Props(invalidProps)).toBe(false);
    });
  });
  
  describe('convertToV2Props 変換ユーティリティ', () => {
    test('V1 propsからV2 propsへの正しい変換', () => {
      const v1Props: FollowButtonPropsV1 = {
        userId: 'user-123',
        initialFollowing: true,
        size: 'small',
        variant: 'outlined',
        sx: { mt: 2 },
        // @ts-ignore - V1では許可されていた余分なprops
        extraProp: 'should be removed',
        'data-testid': 'follow-button',
        'aria-expanded': false
      };
      
      const v2Props = convertToV2Props(v1Props);
      
      // 必要なpropsは保持
      expect(v2Props.userId).toBe('user-123');
      expect(v2Props.initialFollowing).toBe(true);
      expect(v2Props.size).toBe('small');
      expect(v2Props['data-testid']).toBe('follow-button');
      expect(v2Props['aria-expanded']).toBe(false);
      
      // 不要なpropsは除外
      expect('extraProp' in v2Props).toBe(false);
    });
  });
  
  describe('統合テスト', () => {
    test('実際のコンポーネントで型安全性が機能', () => {
      const mockOnFollowChange = jest.fn();
      
      // 正しい型のprops
      const props: FollowButtonPropsV1 = {
        userId: 'test-user',
        initialFollowing: false,
        onFollowChange: mockOnFollowChange,
        size: 'medium',
        variant: 'contained',
        color: 'primary',
        'data-testid': 'follow-button'
      };
      
      const { getByTestId } = render(<FollowButton {...props} />);
      const button = getByTestId('follow-button');
      
      // ボタンが正しくレンダリングされる
      expect(button).toBeInTheDocument();
      expect(button.tagName).toBe('BUTTON');
      
      // 不正な属性が含まれていない
      expect(button).not.toHaveAttribute('button');
      expect(button).not.toHaveAttribute('component');
    });
  });
});