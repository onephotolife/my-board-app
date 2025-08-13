'use client';

import React, { useState } from 'react';
import { Box, Button, Typography, Container, Paper, Alert } from '@mui/material';
import PasswordChangeDialog from '../profile/components/PasswordChangeDialog';

export default function TestPasswordDialogPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const handlePasswordChange = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    console.log('パスワード変更リクエスト:', data);
    
    // テスト用のシミュレート
    return new Promise<{ success: boolean; message?: string }>((resolve) => {
      setTimeout(() => {
        // 現在のパスワードが "test123" の場合は成功
        if (data.currentPassword === 'test123') {
          resolve({
            success: true,
            message: 'パスワードを変更しました（テスト）',
          });
        } else {
          resolve({
            success: false,
            message: '現在のパスワードが正しくありません（テスト用: test123）',
          });
        }
      }, 1000);
    });
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          パスワード変更ダイアログテスト
        </Typography>
        
        <Typography variant="body1" paragraph>
          このページはパスワード変更ダイアログの動作確認用です。
        </Typography>

        <Alert severity="info" sx={{ mb: 3 }}>
          テスト用の現在のパスワード: <strong>test123</strong>
        </Alert>

        {message && (
          <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}

        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            onClick={() => {
              setDialogOpen(true);
              setMessage({ type: 'info', text: 'ダイアログを開きました' });
            }}
          >
            パスワード変更ダイアログを開く
          </Button>

          <Button
            variant="outlined"
            onClick={() => {
              setMessage({ type: 'success', text: 'テストメッセージ: 成功' });
            }}
          >
            成功メッセージテスト
          </Button>

          <Button
            variant="outlined"
            color="error"
            onClick={() => {
              setMessage({ type: 'error', text: 'テストメッセージ: エラー' });
            }}
          >
            エラーメッセージテスト
          </Button>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            テスト手順:
          </Typography>
          <ol>
            <li>「パスワード変更ダイアログを開く」ボタンをクリック</li>
            <li>ダイアログが表示されることを確認</li>
            <li>各フィールドに入力できることを確認</li>
            <li>パスワード表示/非表示ボタンが動作することを確認</li>
            <li>現在のパスワードに「test123」と入力</li>
            <li>新しいパスワードに有効な値を入力（8文字以上）</li>
            <li>確認パスワードに同じ値を入力</li>
            <li>「変更する」ボタンをクリック</li>
            <li>成功メッセージが表示されることを確認</li>
            <li>ダイアログが自動的に閉じることを確認</li>
          </ol>
        </Box>

        <Box sx={{ mt: 4 }}>
          <Typography variant="h6" gutterBottom>
            確認ポイント:
          </Typography>
          <ul>
            <li>ダイアログが正しく開閉する</li>
            <li>aria-hiddenエラーが発生しない</li>
            <li>フォーカス管理が適切</li>
            <li>キャンセルボタンで閉じられる</li>
            <li>Escキーで閉じられる</li>
            <li>背景クリックで閉じられる</li>
            <li>バリデーションエラーが表示される</li>
            <li>送信中はフォームが無効化される</li>
          </ul>
        </Box>
      </Paper>

      <PasswordChangeDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setMessage({ type: 'info', text: 'ダイアログを閉じました' });
        }}
        onSubmit={handlePasswordChange}
      />
    </Container>
  );
}