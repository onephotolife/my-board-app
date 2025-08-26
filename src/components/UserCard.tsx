'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  Avatar,
  Typography,
  Box,
  Chip,
  Stack,
} from '@mui/material';
import FollowButton from './FollowButton';

interface UserCardProps {
  userId: string;
  name: string;
  email?: string;
  bio?: string;
  avatar?: string;
  followersCount?: number;
  followingCount?: number;
  postsCount?: number;
  isFollowing?: boolean;
  showFollowButton?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  isCurrentUser?: boolean;
}

export default function UserCard({
  userId,
  name,
  email,
  bio,
  avatar,
  followersCount = 0,
  followingCount = 0,
  postsCount = 0,
  isFollowing = false,
  showFollowButton = true,
  onFollowChange,
  isCurrentUser = false,
}: UserCardProps) {
  const getInitials = (name: string) => {
    const parts = name.split(' ');
    return parts
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Card sx={{ height: '100%' }}>
      <CardHeader
        avatar={
          <Avatar
            src={avatar}
            sx={{ 
              width: 56, 
              height: 56,
              bgcolor: 'primary.main',
              fontSize: '1.25rem'
            }}
          >
            {!avatar && getInitials(name)}
          </Avatar>
        }
        action={
          showFollowButton && !isCurrentUser && (
            <FollowButton
              userId={userId}
              initialFollowing={isFollowing}
              onFollowChange={onFollowChange}
            />
          )
        }
        title={
          <Typography variant="h6" component="div">
            {name}
            {isCurrentUser && (
              <Chip
                label="あなた"
                size="small"
                color="primary"
                sx={{ ml: 1 }}
              />
            )}
          </Typography>
        }
        subheader={email}
      />
      
      <CardContent>
        {bio && (
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{
              display: '-webkit-box',
              WebkitLineClamp: 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              minHeight: '3em',
            }}
          >
            {bio}
          </Typography>
        )}
        
        <Box sx={{ mt: 2 }}>
          <Stack 
            direction="row" 
            spacing={1} 
            flexWrap="wrap"
            useFlexGap
          >
            <Chip
              label={`${followersCount} フォロワー`}
              size="small"
              variant="outlined"
              sx={{ mb: 1 }}
            />
            <Chip
              label={`${followingCount} フォロー中`}
              size="small"
              variant="outlined"
              sx={{ mb: 1 }}
            />
            {postsCount > 0 && (
              <Chip
                label={`${postsCount} 投稿`}
                size="small"
                variant="outlined"
                sx={{ mb: 1 }}
              />
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );
}