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
  showIcon = true,
  followText = 'フォロー',
  followingText = 'フォロー中',
  loadingText = '処理中...',
  compact = false,
  size = 'medium',
  variant,
  color,
  sx,
  className,
  disabled,
  ...restProps
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showError, setShowError] = useState(false);
  const secureFetch = useSecureFetch();

  const handleFollowToggle = useCallback(async () => {
    if (isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const method = isFollowing ? 'DELETE' : 'POST';
      const response = await secureFetch(`/api/follow/${userId}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // 詳細なエラーログ追加
      if (!response.ok) {
        console.error('Follow API Error:', {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          method: method,
          userId: userId,
          timestamp: new Date().toISOString()
        });

        // 404の場合の特別処理
        if (response.status === 404) {
          console.warn('404 detected - checking API availability');
          // APIの存在確認メッセージ
        }

        // response.json()のエラー処理
        const data = await response.json().catch(() => ({}));

        // エラーメッセージの改善
        if (response.status === 401) {
          setError('ログインが必要です');
        } else if (response.status === 400 && data.error === 'Cannot follow yourself') {
          setError('自分自身はフォローできません');
        } else if (response.status === 404) {
          setError('APIエンドポイントが見つかりません。ページを再読み込みしてください。');
        } else if (response.status === 409) {
          setError('既にフォローしています');
        } else {
          setError(data.error || `エラーが発生しました (${response.status})`);
        }
        setShowError(true);
        return;
      }

      const data = await response.json();
      // 成功時の処理
      const newFollowingState = data.data?.isFollowing ?? !isFollowing;
      setIsFollowing(newFollowingState);
      
      // コールバック実行
      if (onFollowChange) {
        onFollowChange(newFollowingState);
      }

    } catch (err) {
      console.error('Follow toggle error:', {
        error: err,
        userId,
        isFollowing,
        timestamp: new Date().toISOString()
      });
      setError('ネットワークエラーが発生しました');
      setShowError(true);
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFollowing, onFollowChange, isLoading, secureFetch]);

  const handleCloseError = () => {
    setShowError(false);
  };

  // ボタンのスタイル決定
  const getButtonVariant = (): ButtonProps['variant'] => {
    if (variant) return variant;
    return isFollowing ? 'outlined' : 'contained';
  };

  const getButtonColor = (): ButtonProps['color'] => {
    if (color) return color;
    return isFollowing ? 'inherit' : 'primary';
  };

  // ボタンテキスト
  const getButtonText = () => {
    if (isLoading) return loadingText;
    return isFollowing ? followingText : followText;
  };

  // アイコンの選択
  const getIcon = () => {
    if (!showIcon) return null;
    if (isLoading) {
      return <CircularProgress size={20} sx={{ mr: compact ? 0.5 : 1 }} />;
    }
    return isFollowing ? (
      <CheckIcon sx={{ mr: compact ? 0.5 : 1 }} />
    ) : (
      <PersonAddIcon sx={{ mr: compact ? 0.5 : 1 }} />
    );
  };

  // 型安全なprops処理（V2型定義に基づく）
  // 将来的にV2完全移行時は convertToV2Props を使用
  const safeProps = sanitizeButtonProps(restProps);

  return (
    <>
      <Button
        onClick={handleFollowToggle}
        disabled={isLoading || disabled}
        variant={getButtonVariant()}
        color={getButtonColor()}
        size={size}
        className={className}
        startIcon={!compact ? getIcon() : null}
        sx={{
          minWidth: compact ? 80 : 120,
          textTransform: 'none',
          borderRadius: compact ? 2 : 1,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            transform: 'translateY(-1px)',
            boxShadow: 2,
          },
          ...sx,
        }}
        {...safeProps}
      >
        {compact && showIcon && getIcon()}
        {!compact && getButtonText()}
      </Button>

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
          variant="filled"
        >
          {error}
        </Alert>
      </Snackbar>
    </>
  );
}