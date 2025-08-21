'use client';

import { useState } from 'react';
import {
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Avatar,
  IconButton,
  Typography,
  Box,
  Chip,
  Menu,
  MenuItem,
  Collapse,
  TextField,
  Button,
} from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CommentIcon from '@mui/icons-material/Comment';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Post {
  _id: string;
  title: string;
  content: string;
  author: string;
  authorName: string;
  authorEmail?: string;
  createdAt: string;
  updatedAt: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

interface EnhancedPostCardProps {
  post: Post;
  currentUserId?: string;
  onEdit: (post: Post) => void;
  onDelete: (id: string) => void;
}

export default function EnhancedPostCard({
  post,
  currentUserId,
  onEdit,
  onDelete,
}: EnhancedPostCardProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showComments, setShowComments] = useState(false);
  const [comment, setComment] = useState('');
  
  // 投稿者の判定：APIから返されるcanEdit/canDeleteフラグを優先的に使用
  // フラグがない場合はフォールバックとしてcurrentUserIdで判定
  const isOwner = post.canEdit !== undefined ? post.canEdit : (
    currentUserId && (
      currentUserId === post.author || 
      currentUserId === post.authorEmail ||
      currentUserId === post.author?.toString()
    )
  );
  
  // デバッグ用ログ
  console.log('PostCard ownership:', {
    postId: post._id,
    canEdit: post.canEdit,
    canDelete: post.canDelete,
    isOwner,
    currentUserId,
    postAuthor: post.author
  });
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleEdit = () => {
    handleMenuClose();
    onEdit(post);
  };
  
  const handleDelete = () => {
    handleMenuClose();
    onDelete(post._id);
  };
  
  const formatDate = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), {
        addSuffix: true,
        locale: ja,
      });
    } catch {
      return new Date(dateString).toLocaleString('ja-JP');
    }
  };
  
  const getAvatarColor = (name: string | undefined) => {
    const colors = [
      '#f44336', '#e91e63', '#9c27b0', '#673ab7',
      '#3f51b5', '#2196f3', '#00bcd4', '#009688',
      '#4caf50', '#8bc34a', '#ff9800', '#ff5722',
    ];
    // nameが未定義または空の場合のフォールバック
    if (!name || name.length === 0) {
      return colors[0]; // デフォルトカラー
    }
    const index = name.charCodeAt(0) % colors.length;
    return colors[index];
  };
  
  return (
    <Card sx={{ mb: 3, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
      <CardHeader
        avatar={(
          <Avatar sx={{ bgcolor: getAvatarColor(post.authorName) }}>
            {post.authorName[0]?.toUpperCase() || '?'}
          </Avatar>
        )}
        action={
          isOwner && (
            <>
              <IconButton onClick={handleMenuOpen}>
                <MoreVertIcon />
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                disablePortal={false}
                keepMounted
                elevation={24}
                PaperProps={{
                  style: {
                    zIndex: 2147483647, // 最大のz-index値
                    position: 'fixed',
                  },
                  sx: {
                    zIndex: 2147483647,
                    position: 'fixed !important',
                  }
                }}
                MenuListProps={{
                  style: {
                    zIndex: 2147483647,
                  }
                }}
                PopoverClasses={{
                  root: 'MuiPopover-root',
                  paper: 'MuiPopover-paper'
                }}
                style={{
                  zIndex: 2147483647,
                }}
              >
                <MenuItem onClick={handleEdit}>
                  <EditIcon sx={{ mr: 1 }} fontSize="small" />
                  編集
                </MenuItem>
                <MenuItem onClick={handleDelete} sx={{ color: 'error.main' }}>
                  <DeleteIcon sx={{ mr: 1 }} fontSize="small" />
                  削除
                </MenuItem>
              </Menu>
            </>
          )
        }
        title={(
          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {post.authorName}
            </Typography>
            {isOwner && (
              <Chip label="あなた" size="small" color="primary" />
            )}
          </Box>
        )}
        subheader={formatDate(post.createdAt)}
      />
      
      <CardContent>
        {post.title && (
          <Typography variant="h6" gutterBottom>
            {post.title}
          </Typography>
        )}
        <Typography
          variant="body1"
          component="div"
          sx={{
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowWrap: 'break-word',
          }}
        >
          {post.content}
        </Typography>
        
        {post.updatedAt !== post.createdAt && (
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 2, display: 'block' }}
          >
            (編集済み: {formatDate(post.updatedAt)})
          </Typography>
        )}
      </CardContent>
      
      <CardActions>
        <Button
          size="small"
          startIcon={<CommentIcon />}
          onClick={() => setShowComments(!showComments)}
        >
          コメント
        </Button>
      </CardActions>
      
      <Collapse in={showComments}>
        <Box sx={{ px: 2, pb: 2 }}>
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <TextField
              fullWidth
              size="small"
              placeholder="コメントを入力..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              multiline
              maxRows={3}
            />
            <Button
              variant="contained"
              size="small"
              disabled={!comment.trim()}
              onClick={() => {
                // TODO: コメント投稿機能の実装
                setComment('');
              }}
            >
              投稿
            </Button>
          </Box>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: 'block' }}
          >
            ※ コメント機能は今後実装予定です
          </Typography>
        </Box>
      </Collapse>
    </Card>
  );
}