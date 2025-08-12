'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Box,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Card,
  CardContent
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import SaveIcon from '@mui/icons-material/Save';
import CancelIcon from '@mui/icons-material/Cancel';

export default function ProfilePage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    bio: ''
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin?callbackUrl=/profile');
    }
    
    if (session?.user) {
      setFormData({
        name: session.user.name || '',
        email: session.user.email || '',
        bio: ''
      });
    }
  }, [session, status, router]);

  const handleEditToggle = () => {
    if (isEditing) {
      // キャンセル時は元のデータに戻す
      setFormData({
        name: session?.user?.name || '',
        email: session?.user?.email || '',
        bio: ''
      });
      setMessage(null);
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      // ここでプロフィール更新APIを呼ぶ
      // const response = await fetch('/api/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(formData)
      // });
      
      // 仮の成功処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // セッションを更新
      await update({
        ...session,
        user: {
          ...session?.user,
          name: formData.name
        }
      });
      
      setMessage({ type: 'success', text: 'プロフィールを更新しました' });
      setIsEditing(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'プロフィールの更新に失敗しました' });
    } finally {
      setIsSaving(false);
    }
  };

  if (status === 'loading') {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar sx={{ width: 80, height: 80, mr: 3, bgcolor: 'primary.main' }}>
            <PersonIcon sx={{ fontSize: 40 }} />
          </Avatar>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" gutterBottom>
              プロフィール
            </Typography>
            <Typography variant="body2" color="text.secondary">
              アカウント情報の確認と編集
            </Typography>
          </Box>
          <Box>
            {!isEditing ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleEditToggle}
                startIcon={<PersonIcon />}
              >
                編集
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSaving}
                  startIcon={isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                >
                  保存
                </Button>
                <Button
                  variant="outlined"
                  onClick={handleEditToggle}
                  disabled={isSaving}
                  startIcon={<CancelIcon />}
                >
                  キャンセル
                </Button>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>

      {/* メッセージ表示 */}
      {message && (
        <Alert severity={message.type} sx={{ mb: 3 }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* 基本情報 */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            基本情報
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
            <TextField
              fullWidth
              label="名前"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              disabled={!isEditing}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
            />
            <TextField
              fullWidth
              label="メールアドレス"
              value={formData.email}
              disabled
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />
              }}
              helperText="メールアドレスは変更できません"
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="自己紹介"
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                disabled={!isEditing}
                multiline
                rows={4}
                placeholder="自己紹介を入力してください"
              />
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* アカウント情報 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            アカウント情報
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarTodayIcon sx={{ mr: 2, color: 'action.active' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  アカウント作成日
                </Typography>
                <Typography variant="body1">
                  {new Date().toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <EmailIcon sx={{ mr: 2, color: 'action.active' }} />
              <Box>
                <Typography variant="body2" color="text.secondary">
                  メール確認状態
                </Typography>
                <Typography variant="body1" color="success.main">
                  確認済み
                </Typography>
              </Box>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
}