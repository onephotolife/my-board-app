'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Divider,
  Alert,
  CircularProgress,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Link
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Person as PersonIcon,
  LocationOn as LocationOnIcon,
  Work as WorkIcon,
  School as SchoolIcon,
  Link as LinkIcon,
  Security as SecurityIcon
} from '@mui/icons-material';
import NextLink from 'next/link';

interface UserProfile {
  name: string;
  email: string;
  bio: string;
  location: string;
  occupation: string;
  education: string;
  website: string;
  emailVerified: boolean;
}

interface ProfileEditFormProps {
  initialData: UserProfile;
}

export default function ProfileEditForm({ initialData }: ProfileEditFormProps) {
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState('');
  const [profile, setProfile] = useState<UserProfile>(initialData);
  const [editedProfile, setEditedProfile] = useState<UserProfile>(initialData);

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
    // バリデーション
    if (!editedProfile.name || editedProfile.name.trim().length === 0) {
      setError('名前は必須です');
      return;
    }

    if (editedProfile.name.length > 50) {
      setError('名前は50文字以内で入力してください');
      return;
    }

    if (editedProfile.bio.length > 200) {
      setError('自己紹介は200文字以内で入力してください');
      return;
    }

    if (editedProfile.location.length > 100) {
      setError('場所は100文字以内で入力してください');
      return;
    }

    if (editedProfile.occupation.length > 100) {
      setError('職業は100文字以内で入力してください');
      return;
    }

    if (editedProfile.education.length > 100) {
      setError('学歴は100文字以内で入力してください');
      return;
    }

    if (editedProfile.website && editedProfile.website.length > 0) {
      const urlPattern = /^https?:\/\/.+/;
      if (!urlPattern.test(editedProfile.website)) {
        setError('ウェブサイトは有効なURLを入力してください');
        return;
      }
    }

    setLoading(true);
    setError('');

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editedProfile.name,
          bio: editedProfile.bio,
          location: editedProfile.location,
          occupation: editedProfile.occupation,
          education: editedProfile.education,
          website: editedProfile.website
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProfile(editedProfile);
        setEditMode(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setError(data.error || 'プロフィールの更新に失敗しました');
      }
    } catch (err) {
      console.error('プロフィール更新エラー:', err);
      setError('プロフィールの更新に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 成功メッセージ */}
      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }}>
          プロフィールが更新されました
        </Alert>
      )}

      {/* エラーメッセージ */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              基本情報
            </Typography>
            {!editMode && (
              <Button
                variant="contained"
                startIcon={<EditIcon />}
                onClick={handleEdit}
                sx={{
                  background: 'linear-gradient(45deg, #667eea 30%, #764ba2 90%)',
                }}
              >
                編集
              </Button>
            )}
          </Box>
          
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="名前"
                value={editMode ? editedProfile.name : profile.name}
                onChange={(e) => {
                  if (e.target.value.length <= 50) {
                    setEditedProfile({ ...editedProfile, name: e.target.value });
                  }
                }}
                disabled={!editMode}
                helperText={editMode ? `${editedProfile.name.length}/50文字` : ''}
                error={editMode && editedProfile.name.length > 50}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ mr: 1, color: 'action.active' }} />
                }}
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                label="メールアドレス（変更不可）"
                value={profile.email}
                disabled
                InputProps={{
                  readOnly: true,
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
                onChange={(e) => {
                  if (e.target.value.length <= 200) {
                    setEditedProfile({ ...editedProfile, bio: e.target.value });
                  }
                }}
                disabled={!editMode}
                helperText={editMode ? `${editedProfile.bio.length}/200文字` : ''}
                error={editMode && editedProfile.bio.length > 200}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="場所"
                value={editMode ? editedProfile.location : profile.location}
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setEditedProfile({ ...editedProfile, location: e.target.value });
                  }
                }}
                disabled={!editMode}
                helperText={editMode && editedProfile.location.length > 50 ? `${editedProfile.location.length}/100文字` : ''}
                error={editMode && editedProfile.location.length > 100}
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
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setEditedProfile({ ...editedProfile, occupation: e.target.value });
                  }
                }}
                disabled={!editMode}
                helperText={editMode && editedProfile.occupation.length > 50 ? `${editedProfile.occupation.length}/100文字` : ''}
                error={editMode && editedProfile.occupation.length > 100}
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
                onChange={(e) => {
                  if (e.target.value.length <= 100) {
                    setEditedProfile({ ...editedProfile, education: e.target.value });
                  }
                }}
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
                onChange={(e) => {
                  setEditedProfile({ ...editedProfile, website: e.target.value });
                }}
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

          {!editMode && (
            <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Link component={NextLink} href="/profile/change-password" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SecurityIcon />
                パスワードを変更
              </Link>
            </Box>
          )}
        </CardContent>
      </Card>
    </>
  );
}