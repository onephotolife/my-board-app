'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Alert,
  Box,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  Send as SendIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';

interface EmailResendButtonProps {
  email?: string;
  onSuccess?: () => void;
  onError?: (error: string) => void;
}

/**
 * メール再送信ボタンコンポーネント
 * レート制限、クールダウン、視覚的フィードバックを実装
 */
export default function EmailResendButton({
  email,
  onSuccess,
  onError,
}: EmailResendButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownTime, setCooldownTime] = useState(0);
  const [message, setMessage] = useState<{
    type: 'success' | 'error' | 'info' | null;
    text: string;
  }>({ type: null, text: '' });
  const [resendCount, setResendCount] = useState(0);
  const MAX_RESENDS = 3;

  // クールダウンタイマー
  useEffect(() => {
    if (cooldownTime > 0) {
      const timer = setTimeout(() => {
        setCooldownTime(cooldownTime - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownTime]);

  // localStorage からresend履歴を取得
  useEffect(() => {
    const savedData = localStorage.getItem('email-resend-data');
    if (savedData) {
      const data = JSON.parse(savedData);
      const now = Date.now();
      
      // 1時間以内の再送信回数をカウント
      const recentResends = data.resends?.filter(
        (timestamp: number) => now - timestamp < 60 * 60 * 1000
      ) || [];
      
      setResendCount(recentResends.length);
      
      // 最後の再送信から60秒以内ならクールダウン
      if (recentResends.length > 0) {
        const lastResend = Math.max(...recentResends);
        const timeSinceLastResend = Math.floor((now - lastResend) / 1000);
        if (timeSinceLastResend < 60) {
          setCooldownTime(60 - timeSinceLastResend);
        }
      }
    }
  }, []);

  const handleResend = async () => {
    if (resendCount >= MAX_RESENDS) {
      setMessage({
        type: 'error',
        text: `再送信回数の上限（${MAX_RESENDS}回）に達しました。1時間後に再試行してください。`,
      });
      onError?.('再送信回数の上限に達しました');
      return;
    }

    setIsLoading(true);
    setMessage({ type: null, text: '' });

    try {
      const requestEmail = email || prompt('メールアドレスを入力してください:');
      
      if (!requestEmail) {
        setMessage({
          type: 'error',
          text: 'メールアドレスが必要です',
        });
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: requestEmail }),
      });

      const data = await response.json();

      if (!response.ok) {
        // レート制限エラー
        if (response.status === 429) {
          const retryAfter = data.retryAfter || 60;
          setCooldownTime(retryAfter);
          setMessage({
            type: 'error',
            text: data.error || `しばらくお待ちください（${retryAfter}秒）`,
          });
          onError?.(data.error);
        } else {
          setMessage({
            type: 'error',
            text: data.error || 'メール送信に失敗しました',
          });
          onError?.(data.error);
        }
      } else {
        // 成功時の処理
        setMessage({
          type: 'success',
          text: '確認メールを再送信しました。メールボックスをご確認ください。',
        });
        
        // クールダウン設定（60秒）
        setCooldownTime(60);
        
        // 再送信履歴を保存
        const now = Date.now();
        const savedData = localStorage.getItem('email-resend-data');
        const data = savedData ? JSON.parse(savedData) : { resends: [] };
        data.resends = [...(data.resends || []), now].slice(-MAX_RESENDS);
        localStorage.setItem('email-resend-data', JSON.stringify(data));
        
        setResendCount(data.resends.length);
        onSuccess?.();
      }
    } catch (error) {
      console.error('Resend error:', error);
      setMessage({
        type: 'error',
        text: 'ネットワークエラーが発生しました',
      });
      onError?.('ネットワークエラー');
    } finally {
      setIsLoading(false);
    }
  };

  const isDisabled = isLoading || cooldownTime > 0 || resendCount >= MAX_RESENDS;
  const remainingResends = MAX_RESENDS - resendCount;

  return (
    <Box sx={{ width: '100%', my: 2 }}>
      {/* メッセージ表示 */}
      {message.type && (
        <Alert
          severity={message.type === 'info' ? 'info' : message.type}
          icon={
            message.type === 'success' ? (
              <CheckCircleIcon />
            ) : message.type === 'error' ? (
              <ErrorIcon />
            ) : undefined
          }
          sx={{ mb: 2 }}
        >
          {message.text}
        </Alert>
      )}

      {/* 再送信ボタン */}
      <Button
        fullWidth
        variant="outlined"
        color="primary"
        size="large"
        onClick={handleResend}
        disabled={isDisabled}
        startIcon={
          isLoading ? (
            <CircularProgress size={20} color="inherit" />
          ) : (
            <SendIcon />
          )
        }
        sx={{
          py: 1.5,
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {isLoading
          ? '送信中...'
          : cooldownTime > 0
          ? `再送信可能まで ${cooldownTime}秒`
          : '確認メールを再送信'}
      </Button>

      {/* クールダウンプログレスバー */}
      {cooldownTime > 0 && (
        <LinearProgress
          variant="determinate"
          value={100 - (cooldownTime / 60) * 100}
          sx={{ mt: 1, height: 2 }}
        />
      )}

      {/* 残り回数表示 */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 1, textAlign: 'center' }}
      >
        {remainingResends > 0
          ? `残り再送信可能回数: ${remainingResends}回`
          : '再送信回数の上限に達しました（1時間後にリセット）'}
      </Typography>

      {/* ヘルプテキスト */}
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mt: 2, textAlign: 'center' }}
      >
        メールが届かない場合は、迷惑メールフォルダもご確認ください
      </Typography>
    </Box>
  );
}