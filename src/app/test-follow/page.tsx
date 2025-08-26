'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Stack,
  Alert,
  AlertTitle,
  Divider,
  Card,
  CardContent,
  Grid,
  Chip,
  CircularProgress,
  Button,
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import FollowButton from '@/components/FollowButton';

// 有効なMongoDBのObjectID（24文字の16進数）を使用
// これらは実際のユーザーIDではありませんが、形式的に有効です
const TEST_USER_IDS = {
  user1: '507f1f77bcf86cd799439001',
  user2: '507f1f77bcf86cd799439002',
  user3: '507f1f77bcf86cd799439003',
  user4: '507f1f77bcf86cd799439004',
  user5: '507f1f77bcf86cd799439005',
  user6: '507f1f77bcf86cd799439006',
  user7: '507f1f77bcf86cd799439007',
  user8: '507f1f77bcf86cd799439008',
  user9: '507f1f77bcf86cd799439009',
  user10: '507f1f77bcf86cd799439010',
  user11: '507f1f77bcf86cd799439011',
};

export default function TestFollowPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [connectionStatus, setConnectionStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking');

  useEffect(() => {
    // ページ読み込み完了をシミュレート
    const timer = setTimeout(() => {
      setIsLoading(false);
      setConnectionStatus('connected');
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        フォローボタン テストページ
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <AlertTitle>テスト環境</AlertTitle>
        このページはフォローボタンコンポーネントの動作テスト用です。
        有効なMongoDBのObjectID形式を使用していますが、実際のユーザーは存在しない可能性があります。
      </Alert>

      {/* 接続状態 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography variant="h6">接続状態:</Typography>
            {connectionStatus === 'connected' ? (
              <Chip
                icon={<CheckCircleIcon />}
                label="接続済み"
                color="success"
                variant="outlined"
              />
            ) : connectionStatus === 'disconnected' ? (
              <Chip
                icon={<ErrorIcon />}
                label="未接続"
                color="error"
                variant="outlined"
              />
            ) : (
              <Chip
                icon={<InfoIcon />}
                label="確認中..."
                color="default"
                variant="outlined"
              />
            )}
          </Stack>
        </CardContent>
      </Card>

      {/* フォローボタンのテストケース */}
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>
              フォローボタンバリエーション
            </Typography>
            <Divider sx={{ my: 2 }} />

            <Stack spacing={3}>
              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  デフォルト状態
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FollowButton 
                    userId={TEST_USER_IDS.user1}
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user2}
                    initialFollowing={true}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  サイズバリエーション
                </Typography>
                <Stack direction="row" spacing={2} alignItems="center">
                  <FollowButton 
                    userId={TEST_USER_IDS.user3}
                    size="small"
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user4}
                    size="medium"
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user5}
                    size="large"
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  コンパクトモード
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FollowButton 
                    userId={TEST_USER_IDS.user6}
                    compact={true}
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user7}
                    compact={true}
                    initialFollowing={true}
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  カスタムテキスト
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FollowButton 
                    userId={TEST_USER_IDS.user8}
                    followText="購読する"
                    followingText="購読中"
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user9}
                    initialFollowing={true}
                    followText="Follow"
                    followingText="Following"
                  />
                </Stack>
              </Box>

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  非表示テキスト
                </Typography>
                <Stack direction="row" spacing={2}>
                  <FollowButton 
                    userId={TEST_USER_IDS.user10}
                    hideText={true}
                  />
                  <FollowButton 
                    userId={TEST_USER_IDS.user11}
                    hideText={true}
                    initialFollowing={true}
                  />
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>

        {/* エラー状態のシミュレーション */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              エラー処理テスト
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Alert severity="warning" sx={{ mb: 2 }}>
              <AlertTitle>注意</AlertTitle>
              これらのテストユーザーIDはデータベースに存在しない可能性があります。
              404エラーが発生する場合は正常な動作です。
            </Alert>
            <Stack spacing={2}>
              <Button
                variant="outlined"
                onClick={() => {
                  console.log('テスト: 無効なユーザーID形式');
                  // この機能は別途実装が必要
                }}
              >
                無効なユーザーIDでテスト
              </Button>
              <Button
                variant="outlined"
                onClick={() => {
                  console.log('テスト: ネットワークエラー');
                  // この機能は別途実装が必要
                }}
              >
                ネットワークエラーをシミュレート
              </Button>
            </Stack>
          </Paper>
        </Grid>

        {/* パフォーマンステスト */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              パフォーマンステスト
            </Typography>
            <Divider sx={{ my: 2 }} />
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  複数のフォローボタンを同時に表示
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {Object.values(TEST_USER_IDS).slice(0, 5).map((userId, index) => (
                    <FollowButton
                      key={userId}
                      userId={userId}
                      size="small"
                      compact={true}
                    />
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* デバッグ情報 */}
      <Box sx={{ mt: 4 }}>
        <Paper sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
          <Typography variant="h6" gutterBottom>
            デバッグ情報
          </Typography>
          <Typography variant="body2" component="pre" sx={{ fontFamily: 'monospace' }}>
            {JSON.stringify({
              environment: process.env.NODE_ENV,
              timestamp: new Date().toISOString(),
              validObjectIdFormat: '24文字の16進数文字列',
              exampleObjectId: '507f1f77bcf86cd799439011',
              testUserIds: Object.keys(TEST_USER_IDS).length + '個のテストID使用中',
            }, null, 2)}
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}