'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  IconButton,
  Box,
  Chip,
  Avatar,
  Stack,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface PostCardProps {
  post: {
    _id: string;
    title: string;
    content: string;
    author: string;
    authorInfo: {
      name: string;
      email: string;
      avatar?: string;
    };
    tags?: string[];
    likes: string[];
    status: string;
    createdAt: string;
    updatedAt: string;
  };
  currentUserId?: string;
  onRefresh?: () => void;
}

export default function PostCard({ post, currentUserId, onRefresh }: PostCardProps) {
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isLiked, setIsLiked] = useState(post.likes.includes(currentUserId || ''));
  const [likeCount, setLikeCount] = useState(post.likes.length);

  const isOwner = currentUserId === post.author;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleEdit = () => {
    handleMenuClose();
    router.push(`/board/${post._id}/edit`);
  };

  const handleDeleteClick = () => {
    handleMenuClose();
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDeleteDialogOpen(false);
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      }
    } catch (error) {
      console.error('削除エラー:', error);
    }
  };

  const handleLike = async () => {
    if (!currentUserId) return;

    try {
      // 楽観的更新
      setIsLiked(!isLiked);
      setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);

      // API呼び出し（実装省略）
      // await fetch(`/api/posts/${post._id}/like`, { method: 'POST' });
    } catch (error) {
      // エラー時は元に戻す
      setIsLiked(isLiked);
      setLikeCount(likeCount);
    }
  };

  const formattedDate = formatDistanceToNow(new Date(post.createdAt), {
    addSuffix: true,
    locale: ja,
  });

  return (
    <>
      <Card sx={{ mb: 2, position: 'relative' }}>
        <CardContent>
          {/* ヘッダー */}
          <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
            <Avatar
              src={post.authorInfo.avatar}
              sx={{ width: 40, height: 40, mr: 2 }}
            >
              {post.authorInfo.name[0]}
            </Avatar>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="subtitle2" component="div">
                {post.authorInfo.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {formattedDate}
              </Typography>
            </Box>
            {isOwner && (
              <IconButton
                size="small"
                onClick={handleMenuOpen}
                aria-label="メニュー"
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>

          {/* タイトル */}
          <Typography variant="h6" gutterBottom>
            {post.title}
          </Typography>

          {/* 本文 */}
          <Typography variant="body1" paragraph>
            {post.content}
          </Typography>

          {/* タグ */}
          {post.tags && post.tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
              {post.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  size="small"
                  variant="outlined"
                  component={Link}
                  href={`/board?tag=${tag}`}
                  clickable
                />
              ))}
            </Stack>
          )}
        </CardContent>

        <CardActions sx={{ px: 2, pb: 2 }}>
          <IconButton
            onClick={handleLike}
            color={isLiked ? 'error' : 'default'}
            aria-label="いいね"
          >
            {isLiked ? <FavoriteIcon /> : <FavoriteBorderIcon />}
          </IconButton>
          <Typography variant="body2" color="text.secondary">
            {likeCount}
          </Typography>
        </CardActions>
      </Card>

      {/* メニュー */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEdit}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          編集
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          削除
        </MenuItem>
      </Menu>

      {/* 削除確認ダイアログ */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      >
        <DialogTitle>投稿を削除しますか？</DialogTitle>
        <DialogContent>
          <Typography>
            この操作は取り消せません。本当に削除してもよろしいですか？
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            キャンセル
          </Button>
          <Button
            onClick={handleDeleteConfirm}
            color="error"
            variant="contained"
          >
            削除
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}