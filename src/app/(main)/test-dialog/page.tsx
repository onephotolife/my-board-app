'use client';

import React, { useState } from 'react';
import { Container, Typography, Button, Box, Paper } from '@mui/material';
import PasswordChangeDialog from '../profile/components/PasswordChangeDialog';

export default function TestDialogPage() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [result, setResult] = useState<string>('');

  const handlePasswordChange = async (data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }) => {
    console.log('Password change request:', data);
    
    // モック処理
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // 成功を返す
    setResult(`パスワード変更リクエスト受信: 現在=${data.currentPassword}, 新規=${data.newPassword}`);
    return {
      success: true,
      message: 'パスワードを変更しました（テスト）'
    };
  };

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Paper sx={{ p: 4 }}>
        <Typography variant="h4" gutterBottom>
          パスワード変更ダイアログテスト
        </Typography>
        
        <Typography variant="body1" sx={{ mb: 3 }}>
          このページは認証なしでパスワード変更ダイアログをテストするためのページです。
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setDialogOpen(true)}
            size="large"
          >
            パスワード変更ダイアログを開く
          </Button>
          
          {result && (
            <Paper sx={{ p: 2, bgcolor: 'grey.100' }}>
              <Typography variant="body2">
                結果: {result}
              </Typography>
            </Paper>
          )}
        </Box>
      </Paper>
      
      <PasswordChangeDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSubmit={handlePasswordChange}
      />
    </Container>
  );
}