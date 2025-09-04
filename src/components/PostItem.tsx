'use client';

import { memo } from 'react';
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import NextLink from 'next/link';
import Link from '@mui/material/Link';

import { CanEdit, CanDelete } from '@/components/permissions/PermissionGate';
import type { UnifiedPost } from '@/types/post';
import { linkifyHashtags } from '@/app/utils/hashtag';

interface PostItemProps {
  post: UnifiedPost;
  onEdit: (post: UnifiedPost) => void;
  onDelete: (id: string) => void;
}

const PostItem = memo(function PostItem({ post, onEdit, onDelete }: PostItemProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP');
  };

  return (
    <ListItem
      sx={{
        alignItems: 'flex-start',
        '&:hover': { bgcolor: 'action.hover' },
        py: { xs: 1.5, sm: 2 },
        px: { xs: 1, sm: 2 },
        flexDirection: { xs: 'column', sm: 'row' },
        width: '100%',
        maxWidth: '100%',
        overflow: 'hidden',
      }}
      secondaryAction={
        <Box sx={{ display: 'flex', gap: { xs: 0, sm: 1 } }}>
          <CanEdit
            resourceOwnerId={post.author}
            fallback={
              <Tooltip title="編集権限がありません">
                <span>
                  <IconButton edge="end" disabled>
                    <EditIcon />
                  </IconButton>
                </span>
              </Tooltip>
            }
          >
            <IconButton edge="end" aria-label="edit" onClick={() => onEdit(post)}>
              <EditIcon />
            </IconButton>
          </CanEdit>

          <CanDelete
            resourceOwnerId={post.author}
            fallback={
              <Tooltip title="削除権限がありません">
                <span>
                  <IconButton edge="end" disabled>
                    <DeleteIcon />
                  </IconButton>
                </span>
              </Tooltip>
            }
          >
            <IconButton edge="end" aria-label="delete" onClick={() => onDelete(post._id)}>
              <DeleteIcon />
            </IconButton>
          </CanDelete>
        </Box>
      }
    >
      <ListItemText
        primary={
          <Box>
            <Typography
              variant="h6"
              component="div"
              gutterBottom
              sx={{
                wordBreak: 'break-all',
                overflowWrap: 'break-word',
              }}
            >
              {post.title}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              gutterBottom
              sx={{
                wordBreak: 'break-word',
                overflowWrap: 'break-word',
              }}
            >
              投稿者: {post.author} | {formatDate(post.createdAt)}
            </Typography>
          </Box>
        }
        secondary={
          <Typography
            variant="body1"
            sx={{
              mt: 1,
              wordBreak: 'break-all',
              overflowWrap: 'break-word',
              whiteSpace: 'pre-wrap',
            }}
          >
            {linkifyHashtags(post.content).map((part, idx) =>
              typeof part === 'string' ? (
                <span key={idx}>{part}</span>
              ) : (
                <Link
                  key={idx}
                  component={NextLink}
                  href={part.href}
                  underline="hover"
                  aria-label={`タグ ${part.text}`}
                >
                  {part.text}
                </Link>
              )
            )}
          </Typography>
        }
        sx={{ pr: 10 }}
      />
    </ListItem>
  );
});

export default PostItem;
