'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Box,
  Container,
  Paper,
  Typography,
  TextField,
  Button,
  Avatar,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  PhotoCamera as PhotoCameraIcon,
  Email as EmailIcon,
  Person as PersonIcon,
  CalendarToday as CalendarTodayIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Language as LanguageIcon,
  DarkMode as DarkModeIcon,
  ArrowBack as ArrowBackIcon,
  Badge as BadgeIcon,
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Link as LinkIcon
} from '@mui/icons-material';

interface UserProfile {
  name: string;
  email: string;
  bio: string;
  location: string;
  occupation: string;
  education: string;
  website: string;
  memberSince: string;
  emailVerified: boolean;
  totalPosts: number;
  lastLogin: string;
  avatar?: string;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    email: '',
    bio: '',
    location: '',
    occupation: '',
    education: '',
    website: '',
    memberSince: new Date().toISOString(),
    emailVerified: false,
    totalPosts: 0,
    lastLogin: new Date().toISOString()
  });

  const [editedProfile, setEditedProfile] = useState<UserProfile>(profile);
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    darkMode: false,
    language: 'ja'
  });

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
      return;
    }

    if (status === 'authenticated' && session?.user) {
      // ユーザー情報を設定
      const userProfile: UserProfile = {
        name: session.user.name || '',
        email: session.user.email || '',
        bio: 'こんにちは！会員制掲示板のメンバーです。',
        location: '東京, 日本',
        occupation: 'ソフトウェアエンジニア',
        education: '情報工学部',
        website: 'https://example.com',
        memberSince: '2024-01-01T00:00:00Z',
        emailVerified: session.user.emailVerified || false,
        totalPosts: Math.floor(Math.random() * 50) + 1,
        lastLogin: new Date().toISOString()
      };
      setProfile(userProfile);
      setEditedProfile(userProfile);
    }
  }, [status, session, router]);

  const handleEdit = () => {
    setEditMode(true);
    setEditedProfile({ ...profile });
  };

  const handleCancel = () => {
    setEditMode(false);
    setEditedProfile(profile);
    setError('');
  };

  const handleSave = async () => {
    setLoading(true);
    setError('');

    try {
      // APIエンドポイントが実装されたら使用
      // const response = await fetch('/api/users/profile', {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(editedProfile)
      // });

      // 仮の成功処理
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setProfile(editedProfile);
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('新しいパスワードが一致しません');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      setError('パスワードは8文字以上にしてください');
      return;
    }

    setLoading(true);
    try {
      // パスワード変更API実装
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setPasswordDialogOpen(false);
      setSaveSuccess(true);
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError('パスワードの変更に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (status === 'loading') {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f5f5f5' }}>
      {/* ヘッダー */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          py: 4,
          mb: -8
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <IconButton onClick={() => router.push('/dashboard')} sx={{ color: 'white', mr: 2 }}>
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              プロフィール
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        {/* 成功メッセージ */}
        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 3, mt: 10 }}>
            プロフィールが更新されました
          </Alert>
        )}

        {/* エラーメッセージ */}
        {error && (
          <Alert severity="error" sx={{ mb: 3, mt: 10 }} onClose={() => setError('')}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3} sx={{ mt: 8 }}>
          {/* 左側：プロフィール画像と基本情報 */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Box sx={{ position: 'relative', display: 'inline-block' }}>
                  <Avatar
                    sx={{
                      width: 150,
                      height: 150,
                      fontSize: '3rem',
                      bgcolor: 'primary.main',
                      mb: 2
                    }}
                  >
                    {profile.name?.[0]?.toUpperCase() || profile.email?.[0]?.toUpperCase() || 'U'}
                  </Avatar>
                  {editMode && (
                    <IconButton
                      sx={{
                        position: 'absolute',
                        bottom: 10,
                        right: -10,
                        bgcolor: 'background.paper',
                        boxShadow: 2
                      }}
                    >
                      <PhotoCameraIcon />
                    </IconButton>
                  )}
                </Box>
                
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {profile.name || 'ユーザー'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {profile.email}
                </Typography>
                
                {profile.emailVerified && (
                  <Chip
                    icon={<BadgeIcon />}
                    label="認証済み"
                    color="success"
                    size="small"
                    sx={{ mt: 1 }}
                  />
                )}

                <Divider sx={{ my: 3 }} />

                <List dense>
                  <ListItem>
                    <ListItemIcon>
                      <CalendarTodayIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="登録日"
                      secondary={formatDate(profile.memberSince)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="総投稿数"
                      secondary={`${profile.totalPosts} 件`}
                    />
                  </ListItem>
                </List>

                {!editMode && (
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<EditIcon />}
                    onClick={handleEdit}
                    sx={{
                      mt: 3,
                      background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                    }}
                  >
                    プロフィールを編集
                  </Button>
                )}
              </CardContent>
            </Card>
          </Grid>

          {/* 右側：詳細情報 */}
          <Grid item xs={12} md={8}>
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  基本情報
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <Grid container spacing={3}>
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="名前"
                      value={editMode ? editedProfile.name : profile.name}
                      onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="自己紹介"
                      multiline
                      rows={4}
                      value={editMode ? editedProfile.bio : profile.bio}
                      onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                      disabled={!editMode}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="場所"
                      value={editMode ? editedProfile.location : profile.location}
                      onChange={(e) => setEditedProfile({ ...editedProfile, location: e.target.value })}
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: <LocationOnIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="職業"
                      value={editMode ? editedProfile.occupation : profile.occupation}
                      onChange={(e) => setEditedProfile({ ...editedProfile, occupation: e.target.value })}
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: <WorkIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="学歴"
                      value={editMode ? editedProfile.education : profile.education}
                      onChange={(e) => setEditedProfile({ ...editedProfile, education: e.target.value })}
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: <SchoolIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="ウェブサイト"
                      value={editMode ? editedProfile.website : profile.website}
                      onChange={(e) => setEditedProfile({ ...editedProfile, website: e.target.value })}
                      disabled={!editMode}
                      InputProps={{
                        startAdornment: <LinkIcon sx={{ mr: 1, color: 'action.active' }} />
                      }}
                    />
                  </Grid>
                </Grid>

                {editMode && (
                  <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <Button
                      variant="outlined"
                      startIcon={<CancelIcon />}
                      onClick={handleCancel}
                      disabled={loading}
                    >
                      キャンセル
                    </Button>
                    <Button
                      variant="contained"
                      startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
                      onClick={handleSave}
                      disabled={loading}
                      sx={{
                        background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                      }}
                    >
                      保存
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>

            {/* セキュリティ設定 */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                  セキュリティ & プライバシー
                </Typography>
                <Divider sx={{ mb: 3 }} />

                <List>
                  <ListItem button onClick={() => setPasswordDialogOpen(true)}>
                    <ListItemIcon>
                      <SecurityIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="パスワードを変更"
                      secondary="アカウントのセキュリティを強化"
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemIcon>
                      <NotificationsIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="メール通知"
                      secondary="新しい投稿やコメントの通知"
                    />
                    <Switch
                      checked={preferences.emailNotifications}
                      onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                    />
                  </ListItem>

                  <ListItem>
                    <ListItemIcon>
                      <DarkModeIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="ダークモード"
                      secondary="目に優しい表示"
                    />
                    <Switch
                      checked={preferences.darkMode}
                      onChange={(e) => setPreferences({ ...preferences, darkMode: e.target.checked })}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Container>

      {/* パスワード変更ダイアログ */}
      <Dialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>パスワードを変更</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              type="password"
              label="現在のパスワード"
              value={passwordData.currentPassword}
              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
            />
            <TextField
              fullWidth
              type="password"
              label="新しいパスワード"
              value={passwordData.newPassword}
              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
              helperText="8文字以上で設定してください"
            />
            <TextField
              fullWidth
              type="password"
              label="新しいパスワード（確認）"
              value={passwordData.confirmPassword}
              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordDialogOpen(false)}>キャンセル</Button>
          <Button
            onClick={handlePasswordChange}
            variant="contained"
            disabled={loading}
          >
            変更
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}