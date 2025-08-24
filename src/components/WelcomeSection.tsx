'use client';

import { Paper, Box, Avatar, Typography, Button } from '@mui/material';
import { useRouter } from 'next/navigation';
import DashboardIcon from '@mui/icons-material/Dashboard';
import LogoutIcon from '@mui/icons-material/Logout';
import { signOut } from 'next-auth/react';

interface WelcomeSectionProps {
  session: any;
}

interface StatProps {
  label: string;
  value: string | number;
}

function Stat({ label, value }: StatProps) {
  return (
    <Box textAlign="center">
      <Typography variant="h4" color="white" fontWeight="bold">
        {value}
      </Typography>
      <Typography variant="caption" color="rgba(255,255,255,0.8)">
        {label}
      </Typography>
    </Box>
  );
}

export default function WelcomeSection({ session }: WelcomeSectionProps) {
  const router = useRouter();
  
  const userName = session.user?.name || session.user?.email?.split('@')[0] || 'ユーザー';
  const userInitial = userName[0]?.toUpperCase() || '?';
  
  const handleLogout = async () => {
    await signOut({ redirect: false });
    router.push('/auth/signin');
  };
  
  // 会員登録日からの日数を計算（仮の実装）
  const memberDays = Math.floor((Date.now() - new Date(session.user?.createdAt || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) || 1;
  
  return (
    <Paper 
      sx={{ 
        p: 4, 
        mb: 4,
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        borderRadius: 3,
        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
      }}
    >
      <Box display="flex" alignItems="center" gap={3} flexWrap="wrap">
        <Avatar
          sx={{ 
            width: 80, 
            height: 80, 
            border: '4px solid rgba(255,255,255,0.3)',
            bgcolor: 'rgba(255,255,255,0.2)',
            fontSize: '2rem',
            backdropFilter: 'blur(10px)',
          }}
        >
          {userInitial}
        </Avatar>
        
        <Box flex={1} minWidth={200}>
          <Typography 
            variant="h4" 
            fontWeight="bold" 
            gutterBottom
            sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              maxWidth: { xs: '100%', sm: '400px', md: '600px' }
            }}
            title={`おかえりなさい、${userName}さん！`}
          >
            おかえりなさい、{userName}さん！
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.95 }}>
            今日も素敵な一日をお過ごしください
          </Typography>
          
          <Box display="flex" gap={2} mt={3}>
            <Button
              variant="contained"
              size="large"
              startIcon={<DashboardIcon />}
              onClick={() => router.push('/board')}
              sx={{
                bgcolor: '#ff6b6b',
                color: 'white',
                fontWeight: 'bold',
                fontSize: '1.1rem',
                py: 1.5,
                px: 3,
                '&:hover': {
                  bgcolor: '#ff5252',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 8px 30px rgba(255, 107, 107, 0.4)',
                },
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
                transition: 'all 0.3s ease',
              }}
            >
              掲示板へ移動
            </Button>
            <Button
              variant="outlined"
              size="large"
              startIcon={<LogoutIcon />}
              onClick={handleLogout}
              sx={{
                borderColor: 'white',
                color: 'white',
                '&:hover': {
                  borderColor: 'white',
                  bgcolor: 'rgba(255,255,255,0.1)',
                },
              }}
            >
              ログアウト
            </Button>
          </Box>
        </Box>
        
        <Box 
          display="flex" 
          gap={4}
          sx={{
            '@media (max-width: 900px)': {
              width: '100%',
              justifyContent: 'space-around',
              mt: 2,
            }
          }}
        >
          <Stat label="メンバー歴" value={`${memberDays}日`} />
        </Box>
      </Box>
    </Paper>
  );
}