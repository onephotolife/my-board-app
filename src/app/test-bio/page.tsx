'use client';

import { useState } from 'react';
import { Button, TextField, Box, Typography, Alert } from '@mui/material';

export default function TestBioPage() {
  const [bio, setBio] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);

  const testUpdate = async () => {
    setLoading(true);
    setResult('');
    
    try {
      const response = await fetch('/api/profile-test', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: 'テストユーザー',
          bio: bio,
        }),
      });

      const data = await response.json();
      
      if (response.ok) {
        const debugInfo = data.debug ? 
          `\nデバッグ: 受信="${data.debug.receivedBio}", 保存="${data.debug.savedBio}", 更新数=${data.debug.updateResult?.modified}` : '';
        setResult(`成功: bio="${data.user?.bio || '空'}"${debugInfo}`);
      } else {
        setResult(`エラー: ${data.error}`);
      }
    } catch (error) {
      setResult(`エラー: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ p: 4, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Bio更新テスト
      </Typography>
      
      <TextField
        fullWidth
        label="自己紹介"
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        multiline
        rows={4}
        sx={{ mb: 2 }}
      />
      
      <Button 
        variant="contained" 
        onClick={testUpdate}
        disabled={loading}
        sx={{ mb: 2 }}
      >
        {loading ? '更新中...' : '更新テスト'}
      </Button>
      
      {result && (
        <Alert severity={result.includes('成功') ? 'success' : 'error'}>
          {result}
        </Alert>
      )}
      
      <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100' }}>
        <Typography variant="body2">
          送信データ: {JSON.stringify({ name: 'テストユーザー', bio })}
        </Typography>
      </Box>
    </Box>
  );
}