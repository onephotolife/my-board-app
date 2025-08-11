'use client';

import { Card, CardContent, Avatar, Box, Typography, Button } from '@mui/material';
import CreateIcon from '@mui/icons-material/Create';
import { useSession } from 'next-auth/react';

interface QuickPostCardProps {
  onOpen: () => void;
}

export default function QuickPostCard({ onOpen }: QuickPostCardProps) {
  const { data: session } = useSession();
  
  if (!session?.user) return null;
  
  const userName = session.user.name || session.user.email?.split('@')[0] || 'ユーザー';
  const userInitial = userName[0]?.toUpperCase() || '?';
  
  const getAvatarColor = (name: string) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#00bcd4', '#009688',
      '#4caf50', '#8bc34a', '#ff9800', '#ff5722',
    ];
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  return (
    <Card 
      sx={{ 
        mb: 3,
        background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4,
        }
      }}
      role="region"
      aria-label="投稿作成エリア"
    >
      <CardContent>
        <Box display="flex" gap={2} alignItems="center">
          <Avatar 
            sx={{ 
              bgcolor: getAvatarColor(userName),
              width: 48,
              height: 48,
            }}
            aria-hidden="true"
          >
            {userInitial}
          </Avatar>
          <Box flex={1}>
            <Typography 
              variant="body1" 
              color="text.secondary"
              id="quick-post-label"
            >
              {userName}さん、何か共有しませんか？
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<CreateIcon />}
            onClick={onOpen}
            sx={{ minWidth: 120 }}
            aria-describedby="quick-post-label"
          >
            投稿する
          </Button>
        </Box>
      </CardContent>
    </Card>
  );
}