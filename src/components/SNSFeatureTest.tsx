'use client';

import React from 'react';
import { Box, Typography, Chip, Paper, Stack, Alert, CircularProgress } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';

import { useSNSFeatures } from '@/hooks/sns/useSNSFeatures';

export default function SNSFeatureTest() {
  const { 
    currentUser, 
    featureFlags, 
    isLoading, 
    error,
    isAuthenticated 
  } = useSNSFeatures();

  const features = [
    { key: 'follow', label: 'フォロー機能', phase: 'Phase 1' },
    { key: 'timeline', label: 'タイムライン', phase: 'Phase 1' },
    { key: 'likes', label: 'いいね機能', phase: 'Phase 1' },
    { key: 'notifications', label: '通知機能', phase: 'Phase 1' },
    { key: 'comments', label: 'コメント機能', phase: 'Phase 2' },
    { key: 'realtimeNotifications', label: 'リアルタイム通知', phase: 'Phase 2' },
    { key: 'profile', label: 'プロファイル', phase: 'Phase 2' },
    { key: 'search', label: '検索機能', phase: 'Phase 2' },
    { key: 'privacy', label: 'プライバシー設定', phase: 'Phase 3' },
    { key: 'recommendations', label: 'レコメンド', phase: 'Phase 3' },
    { key: 'analytics', label: 'アナリティクス', phase: 'Phase 3' },
  ];

  const getPhaseColor = (phase: string) => {
    switch(phase) {
      case 'Phase 1': return 'primary';
      case 'Phase 2': return 'secondary';
      case 'Phase 3': return 'default';
      default: return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Paper sx={{ p: 3, m: 2 }}>
      <Typography variant="h5" gutterBottom>
        SNS機能 設定状態
      </Typography>
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" gutterBottom>
          認証状態
        </Typography>
        <Chip 
          label={isAuthenticated ? '認証済み' : '未認証'}
          color={isAuthenticated ? 'success' : 'warning'}
          icon={isAuthenticated ? <CheckCircleIcon /> : <CancelIcon />}
        />
      </Box>

      {currentUser && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle1" gutterBottom>
            現在のユーザー
          </Typography>
          <Typography variant="body2">
            ID: {currentUser._id || 'N/A'}
          </Typography>
          <Typography variant="body2">
            名前: {currentUser.name || 'N/A'}
          </Typography>
          <Typography variant="body2">
            メール: {currentUser.email || 'N/A'}
          </Typography>
        </Box>
      )}

      <Box>
        <Typography variant="subtitle1" gutterBottom>
          機能フラグ状態
        </Typography>
        <Stack direction="row" flexWrap="wrap" spacing={1} sx={{ gap: 1 }}>
          {features.map(feature => {
            const isEnabled = featureFlags[feature.key as keyof typeof featureFlags];
            return (
              <Chip
                key={feature.key}
                label={`${feature.label} (${feature.phase})`}
                color={isEnabled ? getPhaseColor(feature.phase) : 'default'}
                variant={isEnabled ? 'filled' : 'outlined'}
                icon={isEnabled ? <CheckCircleIcon /> : <CancelIcon />}
                sx={{ mb: 1 }}
              />
            );
          })}
        </Stack>
      </Box>

      <Box sx={{ mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          Phase 1: MVP機能（2週間） | Phase 2: 拡張機能（2週間） | Phase 3: 最適化（1週間）
        </Typography>
      </Box>
    </Paper>
  );
}