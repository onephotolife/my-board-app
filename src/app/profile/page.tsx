'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Container,
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Avatar,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Chip
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import EnhancedAppLayout from '@/components/EnhancedAppLayout';

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [profileData, setProfileData] = useState({
    name: '',
    bio: '',
    location: '',
    website: ''
  });
  const [originalData, setOriginalData] = useState({
    name: '',
    bio: '',
    location: '',
    website: ''
  });
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    // 初期データをセット
    if (session?.user) {
      const initialData = {
        name: session.user.name || '',
        bio: '',
        location: '',
        website: ''
      };
      setProfileData(initialData);
      setOriginalData(initialData);
    }
    
    setLoading(false);
  }, [status, session, router]);

  const handleEdit = () => {
    setEditing(true);
    setSaveMessage('');
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setEditing(false);
    setSaveMessage('');
  };

  const handleSave = async () => {
    // ここで実際のAPI呼び出しを行う
    setOriginalData(profileData);
    setEditing(false);
    setSaveMessage('プロフィールを更新しました');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const handleChange = (field: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setProfileData({
      ...profileData,
      [field]: event.target.value
    });
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ 
        display: 'flex', 
        minHeight: '100vh', 
        bgcolor: '#f5f5f5',
        alignItems: 'center', 
        justifyContent: 'center',
        pt: { xs: 8, md: 0 }
      }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <EnhancedAppLayout title="プロフィール" subtitle="アカウント情報の管理">
      <Box sx={{ 
        py: { xs: 2, md: 4 },
        px: { xs: 2, sm: 3, md: 4 }
      }}>
        <Container maxWidth="md" sx={{ py: 4 }}>
          <Typography variant="h4" gutterBottom fontWeight="bold">
            プロフィール
          </Typography>
          
          {saveMessage && (
            <Alert severity="success" sx={{ mb: 3 }}>
              {saveMessage}
            </Alert>
          )}

          <Card>
            <CardContent sx={{ p: 4 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 4 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    bgcolor: 'primary.main',
                    fontSize: '3rem',
                    mr: 3
                  }}
                >
                  {session.user?.name?.[0] || session.user?.email?.[0]?.toUpperCase()}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" gutterBottom>
                    {profileData.name || session.user?.email}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    {session.user?.email}
                  </Typography>
                  <Chip
                    label="メンバー"
                    color="primary"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                </Box>
                {!editing && (
                  <Button
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                  >
                    編集
                  </Button>
                )}
              </Box>

              <Divider sx={{ mb: 3 }} />

              <Stack spacing={3}>
                <TextField
                  label="名前"
                  value={profileData.name}
                  onChange={handleChange('name')}
                  disabled={!editing}
                  fullWidth
                  variant={editing ? 'outlined' : 'standard'}
                  InputProps={{
                    readOnly: !editing
                  }}
                />

                <TextField
                  label="自己紹介"
                  value={profileData.bio}
                  onChange={handleChange('bio')}
                  disabled={!editing}
                  fullWidth
                  multiline
                  rows={4}
                  variant={editing ? 'outlined' : 'standard'}
                  InputProps={{
                    readOnly: !editing
                  }}
                  placeholder="あなたについて教えてください"
                />

                <TextField
                  label="場所"
                  value={profileData.location}
                  onChange={handleChange('location')}
                  disabled={!editing}
                  fullWidth
                  variant={editing ? 'outlined' : 'standard'}
                  InputProps={{
                    readOnly: !editing
                  }}
                  placeholder="例: 東京, 日本"
                />

                <TextField
                  label="ウェブサイト"
                  value={profileData.website}
                  onChange={handleChange('website')}
                  disabled={!editing}
                  fullWidth
                  variant={editing ? 'outlined' : 'standard'}
                  InputProps={{
                    readOnly: !editing
                  }}
                  placeholder="https://example.com"
                />
              </Stack>

              {editing && (
                <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                  <Button
                    variant="outlined"
                    startIcon={<CancelIcon />}
                    onClick={handleCancel}
                  >
                    キャンセル
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<SaveIcon />}
                    onClick={handleSave}
                  >
                    保存
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                アカウント情報
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    メールアドレス
                  </Typography>
                  <Typography variant="body1">
                    {session.user?.email}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    ロール
                  </Typography>
                  <Typography variant="body1">
                    メンバー
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    登録日
                  </Typography>
                  <Typography variant="body1">
                    {new Date().toLocaleDateString('ja-JP')}
                  </Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>
        </Container>
      </Box>
    </EnhancedAppLayout>
  );
}
