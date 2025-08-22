import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { connectDB } from '@/lib/db/mongodb';
import User from '@/lib/models/User';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Avatar,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  IconButton
} from '@mui/material';
import {
  CalendarToday as CalendarTodayIcon,
  Email as EmailIcon,
  ArrowBack as ArrowBackIcon,
  Badge as BadgeIcon
} from '@mui/icons-material';
import ProfileEditForm from './ProfileEditForm';
import Link from 'next/link';

async function getProfileData(email: string) {
  try {
    // データベースから直接プロフィールデータを取得
    await connectDB();
    
    const user = await User.findOne({ email }).select('-password').lean();
    
    if (user) {
      return {
        name: user.name || '',
        email: user.email,
        bio: user.bio || '',
        location: user.location || '',
        occupation: user.occupation || '',
        education: user.education || '',
        website: user.website || '',
        emailVerified: user.emailVerified || false,
        createdAt: user.createdAt ? user.createdAt.toISOString() : new Date().toISOString()
      };
    }
  } catch (error) {
    console.error('プロフィール取得エラー:', error);
  }

  // デフォルト値を返す
  return {
    name: '',
    email: email,
    bio: '',
    location: '',
    occupation: '',
    education: '',
    website: '',
    emailVerified: false,
    createdAt: new Date().toISOString()
  };
}

export default async function ProfilePage() {
  // サーバー側で認証チェック
  const session = await auth();
  
  if (!session?.user) {
    redirect('/auth/signin?callbackUrl=%2Fprofile');
  }

  if (!session.user.emailVerified) {
    redirect('/auth/email-not-verified');
  }

  // サーバー側でプロフィールデータ取得
  const profileData = await getProfileData(session.user.email!);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

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
            <IconButton 
              component={Link}
              href="/dashboard" 
              sx={{ color: 'white', mr: 2 }}
            >
              <ArrowBackIcon />
            </IconButton>
            <Typography variant="h4" sx={{ fontWeight: 700 }}>
              プロフィール
            </Typography>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ pb: 4 }}>
        <Grid container spacing={3} sx={{ mt: 8 }}>
          {/* 左側：プロフィール画像と基本情報 */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 4 }}>
                <Avatar
                  sx={{
                    width: 150,
                    height: 150,
                    fontSize: '3rem',
                    bgcolor: 'primary.main',
                    mb: 2,
                    mx: 'auto'
                  }}
                >
                  {profileData.name?.[0]?.toUpperCase() || profileData.email?.[0]?.toUpperCase() || 'U'}
                </Avatar>
                
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
                  {profileData.name || 'ユーザー'}
                </Typography>
                
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {profileData.email}
                </Typography>
                
                {profileData.emailVerified && (
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
                      secondary={formatDate(profileData.createdAt)}
                    />
                  </ListItem>
                  <ListItem>
                    <ListItemIcon>
                      <EmailIcon />
                    </ListItemIcon>
                    <ListItemText
                      primary="メール認証"
                      secondary={profileData.emailVerified ? '完了' : '未完了'}
                    />
                  </ListItem>
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* 右側：詳細情報（クライアントコンポーネント） */}
          <Grid item xs={12} md={8}>
            <ProfileEditForm initialData={profileData} />
          </Grid>
        </Grid>
      </Container>
    </Box>
  );
}