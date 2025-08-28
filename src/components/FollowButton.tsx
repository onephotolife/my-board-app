'use client';

import React, { useState, useCallback } from 'react';
import { 
  Button, 
  CircularProgress, 
  Snackbar, 
  Alert
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon,
  Check as CheckIcon 
} from '@mui/icons-material';
import { useSecureFetch } from '@/components/CSRFProvider';
import { 
  FollowButtonPropsV1, 
  FollowButtonPropsV2, 
  isV2Props, 
  sanitizeButtonProps,
  convertToV2Props 
} from '@/types/mui-extensions';

// 現在はV1を使用（段階的移行のため）
// 将来的にV2に完全移行予定
type FollowButtonProps = FollowButtonPropsV1;

export default function FollowButton({
  userId,
  initialFollowing = false,
  onFollowChange,
  compact = false,
  disabled: externalDisabled = false,
  ...restProps
}: FollowButtonProps) {
  // デバッグ用: 不正なpropsの検出
  if (process.env.NODE_ENV === 'development') {
    const invalidProps = ['button', 'component', 'ref'];
    const foundInvalid = invalidProps.filter(prop => prop in restProps);
    if (foundInvalid.length > 0) {
      console.warn(
        `FollowButton: 無効なpropsが検出されました: ${foundInvalid.join(', ')}. これらは除外されます。`
      );
    }
  }

  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const secureFetch = useSecureFetch();

  const handleFollowToggle = useCallback(async () => {
    if (!userId) {
      console.error('FollowButton: userId is required');
      setError('ユーザーIDが必要です');
      setShowError(true);
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      const endpoint = `/api/users/${userId}/follow`;
      const method = isFollowing ? 'DELETE' : 'POST';
      
      const response = await secureFetch(endpoint, {
        method: method,
      });

      if (!response) {
        throw new Error('サーバーとの通信に失敗しました');
      }

      if (!response.ok) {
        let errorMessage = 'フォロー操作に失敗しました';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          // JSON解析エラーは無視
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      // 楽観的更新のバリデーション
      if (data.success) {
        const newFollowingState = !isFollowing;
        setIsFollowing(newFollowingState);
        
        // 親コンポーネントへのコールバック
        if (onFollowChange) {
          onFollowChange(newFollowingState);
        }
      } else {
        throw new Error(data.error || 'フォロー操作に失敗しました');
      }
    } catch (err) {
      console.error('Follow toggle error:', err);
      
      let errorMessage = 'エラーが発生しました';
      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      setShowError(true);
      
      // エラー時は状態を元に戻す
      const revertedState = isFollowing;
      setIsFollowing(revertedState);
      
      // エラーでも親コンポーネントに通知
      if (onFollowChange) {
        onFollowChange(revertedState);
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFollowing, secureFetch, onFollowChange]);

  const handleCloseError = useCallback(() => {
    setShowError(false);
  }, []);

  // ボタンのバリアントを決定
  const getButtonVariant = () => {
    if (compact) return 'text';
    return isFollowing ? 'outlined' : 'contained';
  };

  // ボタンの色を決定
  const getButtonColor = () => {
    if (isFollowing) return 'inherit' as const;
    return 'primary' as const;
  };

  // ボタンのテキストを決定
  const getButtonText = () => {
    if (isLoading) return '';
    return isFollowing ? 'フォロー中' : 'フォロー';
  };

  // アイコンの選択
  const getIcon = () => {
    if (isLoading) return null;
    if (isFollowing) return <CheckIcon />;
    return <PersonAddIcon />;
  };

  // 将来的にV2完全移行時は convertToV2Props を使用
  const safeProps = sanitizeButtonProps(restProps);

  return (
    <>
      <Button
        onClick={handleFollowToggle}
        disabled={isLoading || externalDisabled}
        variant={getButtonVariant()}
        color={getButtonColor()}
        size={safeProps.size || (compact ? 'small' : 'medium')}
        className={safeProps.className}
        startIcon={!compact ? getIcon() : undefined}
        aria-label={isFollowing ? 'フォロー解除' : 'フォローする'}
        data-testid="follow-button"
        {...safeProps}
      >
        {isLoading ? (
          <CircularProgress 
            size={compact ? 16 : 20} 
            color="inherit" 
          />
        ) : (
          getButtonText()
        )}
      </Button>
      
      {/* エラー通知 */}
      <Snackbar
        open={showError}
        autoHideDuration={6000}
        onClose={handleCloseError}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseError} 
          severity="error" 
          sx={{ width: '100%' }}
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}