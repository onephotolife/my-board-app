/**
 * MUI コンポーネント拡張型定義
 * Purpose: TypeScriptの型安全性を強化し、不正なprops渡しを防止
 * STRICT120準拠
 */

import { ButtonProps as MuiButtonProps } from '@mui/material/Button';
import { SxProps, Theme } from '@mui/material/styles';

/**
 * HTML属性として無効なprops
 */
export type InvalidHTMLProps = 'button' | 'component' | 'ref';

/**
 * FollowButton用に許可されたMUI ButtonProps
 * 明示的に必要なpropsのみを選択
 */
export interface SafeButtonProps {
  // サイズ関連
  size?: 'small' | 'medium' | 'large';
  
  // バリアント関連
  variant?: 'text' | 'outlined' | 'contained';
  
  // カラー関連（厳密な型定義）
  color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
  
  // 状態関連
  disabled?: boolean;
  
  // スタイル関連
  sx?: SxProps<Theme>;
  className?: string;
  
  // アクセシビリティ関連
  'aria-label'?: string;
  'aria-describedby'?: string;
  'aria-controls'?: string;
  'aria-expanded'?: boolean;
  'aria-haspopup'?: boolean;
  
  // データ属性（テスト用）
  'data-testid'?: string;
}

/**
 * FollowButton V1 Props（後方互換性維持）
 * 既存のコードとの互換性のため、ButtonPropsをOmitで拡張
 */
export interface FollowButtonPropsV1 extends Omit<MuiButtonProps, 'onClick' | InvalidHTMLProps> {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  showIcon?: boolean;
  followText?: string;
  followingText?: string;
  loadingText?: string;
  compact?: boolean;
}

/**
 * FollowButton V2 Props（厳密な型定義）
 * 新しい実装用の厳密な型定義
 */
export interface FollowButtonPropsV2 extends SafeButtonProps {
  // 必須プロパティ
  userId: string;
  
  // 状態管理
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  
  // UI表示制御
  showIcon?: boolean;
  compact?: boolean;
  
  // テキストカスタマイズ
  followText?: string;
  followingText?: string;
  loadingText?: string;
}

/**
 * 型ガード: V2 Propsかどうかを判定
 */
export function isV2Props(props: any): props is FollowButtonPropsV2 {
  // V2の場合、明示的に定義されたpropsのみを含む
  const validV2Keys = [
    'userId', 'initialFollowing', 'onFollowChange',
    'showIcon', 'compact', 'followText', 'followingText', 'loadingText',
    'size', 'variant', 'color', 'disabled', 'sx', 'className',
    'aria-label', 'aria-describedby', 'aria-controls', 'aria-expanded', 'aria-haspopup',
    'data-testid'
  ];
  
  return Object.keys(props).every(key => validV2Keys.includes(key));
}

/**
 * Props検証ユーティリティ
 * 不正なHTMLプロパティを除外
 */
export function sanitizeButtonProps<T extends Record<string, any>>(props: T): SafeButtonProps {
  const invalidKeys: string[] = ['button', 'component', 'ref', 'onClick'];
  const sanitized: Record<string, any> = {};
  
  Object.keys(props).forEach(key => {
    if (!invalidKeys.includes(key)) {
      sanitized[key] = props[key];
    }
  });
  
  return sanitized as SafeButtonProps;
}

/**
 * Props変換ユーティリティ
 * V1 Props を V2 Props に変換
 */
export function convertToV2Props(v1Props: FollowButtonPropsV1): FollowButtonPropsV2 {
  const {
    userId,
    initialFollowing,
    onFollowChange,
    showIcon,
    followText,
    followingText,
    loadingText,
    compact,
    size,
    variant,
    color,
    disabled,
    sx,
    className,
    ...restProps
  } = v1Props;
  
  // data-testid と aria属性のみを抽出
  const allowedRestProps: Partial<SafeButtonProps> = {};
  Object.keys(restProps).forEach(key => {
    if (key.startsWith('data-') || key.startsWith('aria-')) {
      allowedRestProps[key as keyof SafeButtonProps] = restProps[key];
    }
  });
  
  return {
    userId,
    initialFollowing,
    onFollowChange,
    showIcon,
    followText,
    followingText,
    loadingText,
    compact,
    size,
    variant,
    color,
    disabled,
    sx,
    className,
    ...allowedRestProps,
  };
}