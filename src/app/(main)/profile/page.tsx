'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
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
  CardContent,
  IconButton,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Person as PersonIcon,
  Email as EmailIcon,
  CalendarToday as CalendarTodayIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Lock as LockIcon,
  Verified as VerifiedIcon,
} from '@mui/icons-material';
import { useUser } from '@/contexts/UserContext';
import { generateAvatarData } from '@/lib/utils/avatar';
import { validateName, validateBio } from '@/lib/validations/profile';
import PasswordChangeDialog from './components/PasswordChangeDialog';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, error, updateProfile, changePassword, clearError } = useUser();
  
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    bio: '',
  });
  
  const [formErrors, setFormErrors] = useState({
    name: '',
    bio: '',
  });

  // ユーザー情報の初期化
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        bio: user.bio || '',
      });
    }
  }, [user]);

  // エラーメッセージの表示
  useEffect(() => {
    if (error) {
      setMessage({ type: 'error', text: error });
      clearError();
    }
  }, [error, clearError]);

  // 認証チェック
  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/signin?callbackUrl=/profile');
    }
  }, [user, loading, router]);

  // アバターデータの生成
  const avatarData = user ? generateAvatarData(user.name) : null;

  // 編集モードの切り替え
  const handleEditToggle = () => {
    if (isEditing) {
      // キャンセル時は元のデータに戻す
      setFormData({
        name: user?.name || '',
        bio: user?.bio || '',
      });
      setFormErrors({ name: '', bio: '' });
      setMessage(null);
    }
    setIsEditing(!isEditing);
  };

  // 入力変更ハンドラー
  const handleInputChange = (field: 'name' | 'bio') => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // リアルタイムバリデーション
    if (field === 'name') {
      const validation = validateName(value);
      setFormErrors(prev => ({ ...prev, name: validation.error || '' }));
    } else if (field === 'bio') {
      const validation = validateBio(value);
      setFormErrors(prev => ({ ...prev, bio: validation.error || '' }));
    }
  };

  // プロフィール保存
  const handleSave = async () => {
    // バリデーション
    const nameValidation = validateName(formData.name);
    const bioValidation = validateBio(formData.bio);
    
    if (!nameValidation.isValid || !bioValidation.isValid) {
      setFormErrors({
        name: nameValidation.error || '',
        bio: bioValidation.error || '',
      });
      return;
    }
    
    setIsSaving(true);
    setMessage(null);
    
    const result = await updateProfile(formData);
    
    if (result.success) {
      setMessage({ type: 'success', text: result.message || 'プロフィールを更新しました' });
      setIsEditing(false);
    } else {
      setMessage({ type: 'error', text: result.message || 'プロフィールの更新に失敗しました' });
    }
    
    setIsSaving(false);
  };

  // パスワード変更ハンドラー
  const handlePasswordChange = async (data: { currentPassword: string; newPassword: string; confirmPassword: string }) => {
    const result = await changePassword(data);
    
    if (result.success) {
      // パスワード変更成功後、再ログインを促す
      setTimeout(() => {
        signOut({ callbackUrl: '/auth/signin?message=password_changed' });
      }, 2000);
    }
    
    return result;
  };

  if (loading) {
    return (
      <Container maxWidth="md" sx={{ mt: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      {/* ヘッダー */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Avatar 
            sx={{ 
              width: 80, 
              height: 80, 
              mr: 3,
              bgcolor: avatarData?.backgroundColor,
              color: avatarData?.textColor,
              fontSize: '2rem',
              fontWeight: 'bold',
            }}
          >
            {avatarData?.initials}
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
                startIcon={<EditIcon />}
              >
                編集
              </Button>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSave}
                  disabled={isSaving || !!formErrors.name || !!formErrors.bio}
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
              onChange={handleInputChange('name')}
              disabled={!isEditing}
              error={!!formErrors.name}
              helperText={formErrors.name || (isEditing ? `${formData.name.length}/50` : '')}
              InputProps={{
                startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />,
              }}
            />
            <TextField
              fullWidth
              label="メールアドレス"
              value={user.email}
              disabled
              InputProps={{
                startAdornment: <EmailIcon sx={{ mr: 1, color: 'action.active' }} />,
                endAdornment: user.emailVerified && (
                  <Chip
                    icon={<VerifiedIcon />}
                    label="確認済み"
                    size="small"
                    color="success"
                    variant="outlined"
                  />
                ),
              }}
              helperText="メールアドレスは変更できません"
            />
            <Box sx={{ gridColumn: '1 / -1' }}>
              <TextField
                fullWidth
                label="自己紹介"
                value={formData.bio}
                onChange={handleInputChange('bio')}
                disabled={!isEditing}
                error={!!formErrors.bio}
                helperText={formErrors.bio || (isEditing ? `${formData.bio.length}/200` : '')}
                multiline
                rows={4}
                placeholder="自己紹介を入力してください"
              />
              {isEditing && (
                <LinearProgress
                  variant="determinate"
                  value={(formData.bio.length / 200) * 100}
                  sx={{ mt: 1, height: 2 }}
                  color={formData.bio.length > 180 ? 'warning' : 'primary'}
                />
              )}
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* セキュリティ */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            セキュリティ
          </Typography>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="body1" gutterBottom>
                パスワード
              </Typography>
              <Typography variant="body2" color="text.secondary">
                定期的にパスワードを変更することをお勧めします
              </Typography>
            </Box>
            <Button
              variant="outlined"
              startIcon={<LockIcon />}
              onClick={() => setPasswordDialogOpen(true)}
            >
              パスワード変更
            </Button>
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
                  {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  }) : '不明'}
                </Typography>
              </Box>
            </Box>
            {user.updatedAt && (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <EditIcon sx={{ mr: 2, color: 'action.active' }} />
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    最終更新日
                  </Typography>
                  <Typography variant="body1">
                    {new Date(user.updatedAt).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </Typography>
                </Box>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* パスワード変更ダイアログ */}
      <PasswordChangeDialog
        open={passwordDialogOpen}
        onClose={() => setPasswordDialogOpen(false)}
        onSubmit={handlePasswordChange}
      />
    </Container>
  );
}