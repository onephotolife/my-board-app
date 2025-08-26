'use client';

import React, { useState, useCallback } from 'react';
import { 
  Button, 
  CircularProgress, 
  Snackbar, 
  Alert,
  ButtonProps 
} from '@mui/material';
import { 
  PersonAdd as PersonAddIcon,
  Check as CheckIcon 
} from '@mui/icons-material';
import { useSecureFetch } from '@/components/CSRFProvider';

interface FollowButtonProps extends Omit<ButtonProps, 'onClick'> {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  showIcon?: boolean;
  followText?: string;
  followingText?: string;
  loadingText?: string;
  compact?: boolean;
}

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
  ...buttonProps
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

      const data = await response.json();

      if (!response.ok) {
        // エラーハンドリング
        if (response.status === 401) {
          setError('ログインが必要です');
        } else if (response.status === 400 && data.error === 'Cannot follow yourself') {
          setError('自分自身はフォローできません');
        } else if (response.status === 404) {
          setError('ユーザーが見つかりません');
        } else if (response.status === 409) {
          setError('既にフォローしています');
        } else {
          setError(data.error || 'エラーが発生しました');
        }
        setShowError(true);
        return;
      }

      // 成功時の処理
      const newFollowingState = data.data?.isFollowing ?? !isFollowing;
      setIsFollowing(newFollowingState);
      
      // コールバック実行
      if (onFollowChange) {
        onFollowChange(newFollowingState);
      }

    } catch (err) {
      console.error('Follow toggle error:', err);
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

  return (
    <>
      <Button
        onClick={handleFollowToggle}
        disabled={isLoading}
        variant={getButtonVariant()}
        color={getButtonColor()}
        size={size}
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
          ...buttonProps.sx,
        }}
        {...buttonProps}
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