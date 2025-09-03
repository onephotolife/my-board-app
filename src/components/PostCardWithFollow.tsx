'use client';

import React from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  Typography,
  IconButton,
  Box,
  Divider,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Favorite as FavoriteIcon,
  FavoriteBorder as FavoriteBorderIcon,
  Share as ShareIcon,
  Comment as CommentIcon,
} from '@mui/icons-material';

import FollowButton from './FollowButton';

interface PostCardWithFollowProps {
  postId: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  likesCount?: number;
  commentsCount?: number;
  isLiked?: boolean;
  isFollowing?: boolean;
  isCurrentUserPost?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
  onLikeToggle?: () => void;
  onComment?: () => void;
  onShare?: () => void;
  onOptions?: () => void;
}

export default function PostCardWithFollow({
  postId,
  authorId,
  authorName,
  authorAvatar,
  content,
  createdAt,
  likesCount = 0,
  commentsCount = 0,
  isLiked = false,
  isFollowing = false,
  isCurrentUserPost = false,
  onFollowChange,
  onLikeToggle,
  onComment,
  onShare,
  onOptions,
}: PostCardWithFollowProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return `${diffInSeconds}秒前`;
    } else if (diffInSeconds < 3600) {
      return `${Math.floor(diffInSeconds / 60)}分前`;
    } else if (diffInSeconds < 86400) {
      return `${Math.floor(diffInSeconds / 3600)}時間前`;
    } else if (diffInSeconds < 604800) {
      return `${Math.floor(diffInSeconds / 86400)}日前`;
    } else {
      return date.toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
  };

  return (
    <Card sx={{ mb: 2 }}>
      <CardHeader
        avatar={(
          <Avatar
            src={authorAvatar}
            sx={{ bgcolor: 'primary.main' }}
            aria-label={authorName}
          >
            {!authorAvatar && authorName[0].toUpperCase()}
          </Avatar>
        )}
        action={(
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {!isCurrentUserPost && (
              <FollowButton
                userId={authorId}
                initialFollowing={isFollowing}
                onFollowChange={onFollowChange}
                size="small"
                compact
              />
            )}
            <IconButton aria-label="settings" onClick={onOptions}>
              <MoreVertIcon />
            </IconButton>
          </Box>
        )}
        title={(
          <Typography variant="subtitle1" fontWeight="medium">
            {authorName}
          </Typography>
        )}
        subheader={formatDate(createdAt)}
      />
      
      <CardContent>
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
          {content}
        </Typography>
      </CardContent>
      
      <Divider />
      
      <CardActions disableSpacing sx={{ px: 2 }}>
        <IconButton 
          aria-label="like" 
          onClick={onLikeToggle}
          color={isLiked ? 'error' : 'default'}
        >
          {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {likesCount > 0 && likesCount}
        </Typography>
        
        <IconButton aria-label="comment" onClick={onComment}>
          <CommentIcon />
        </IconButton>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 2 }}>
          {commentsCount > 0 && commentsCount}
        </Typography>
        
        <Box sx={{ flexGrow: 1 }} />
        
        <IconButton aria-label="share" onClick={onShare}>
          <ShareIcon />
        </IconButton>
      </CardActions>
    </Card>
  );
}