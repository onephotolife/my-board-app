/**
 * Material-UIコンポーネントの動的インポート
 * Code Splittingによりバンドルサイズを削減
 */

import dynamic from 'next/dynamic';
import type { ComponentType } from 'react';

// よく使用するMaterial-UIコンポーネントの動的インポート
// SSRを無効にしてクライアントサイドでのみロード

export const Box = dynamic(
  () => import('@mui/material/Box').then(mod => ({ default: mod.default })),
  { ssr: true } // Boxはレイアウトに重要なので SSR を維持
);

export const Container = dynamic(
  () => import('@mui/material/Container').then(mod => ({ default: mod.default })),
  { ssr: true } // ContainerもレイアウトのためSSR維持
);

export const CircularProgress = dynamic(
  () => import('@mui/material/CircularProgress').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => <div style={{ width: 40, height: 40 }}>Loading...</div>
  }
);

export const LinearProgress = dynamic(
  () => import('@mui/material/LinearProgress').then(mod => ({ default: mod.default })),
  { 
    ssr: false,
    loading: () => <div style={{ height: 4, background: '#e0e0e0' }} />
  }
);

export const Typography = dynamic(
  () => import('@mui/material/Typography').then(mod => ({ default: mod.default })),
  { ssr: true } // テキスト表示はSEOのため SSR 維持
);

export const Button = dynamic(
  () => import('@mui/material/Button').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const IconButton = dynamic(
  () => import('@mui/material/IconButton').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Card = dynamic(
  () => import('@mui/material/Card').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const CardContent = dynamic(
  () => import('@mui/material/CardContent').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const CardActions = dynamic(
  () => import('@mui/material/CardActions').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const TextField = dynamic(
  () => import('@mui/material/TextField').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Dialog = dynamic(
  () => import('@mui/material/Dialog').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const DialogTitle = dynamic(
  () => import('@mui/material/DialogTitle').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const DialogContent = dynamic(
  () => import('@mui/material/DialogContent').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const DialogActions = dynamic(
  () => import('@mui/material/DialogActions').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Snackbar = dynamic(
  () => import('@mui/material/Snackbar').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Alert = dynamic(
  () => import('@mui/material/Alert').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const AppBar = dynamic(
  () => import('@mui/material/AppBar').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Toolbar = dynamic(
  () => import('@mui/material/Toolbar').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Menu = dynamic(
  () => import('@mui/material/Menu').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const MenuItem = dynamic(
  () => import('@mui/material/MenuItem').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Avatar = dynamic(
  () => import('@mui/material/Avatar').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Chip = dynamic(
  () => import('@mui/material/Chip').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Grid = dynamic(
  () => import('@mui/material/Grid').then(mod => ({ default: mod.default })),
  { ssr: true }
);

export const Paper = dynamic(
  () => import('@mui/material/Paper').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Divider = dynamic(
  () => import('@mui/material/Divider').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const List = dynamic(
  () => import('@mui/material/List').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const ListItem = dynamic(
  () => import('@mui/material/ListItem').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const ListItemText = dynamic(
  () => import('@mui/material/ListItemText').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const ListItemAvatar = dynamic(
  () => import('@mui/material/ListItemAvatar').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const Skeleton = dynamic(
  () => import('@mui/material/Skeleton').then(mod => ({ default: mod.default })),
  { ssr: false }
);

// アイコンの動的インポート
export const PersonIcon = dynamic(
  () => import('@mui/icons-material/Person').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const LogoutIcon = dynamic(
  () => import('@mui/icons-material/Logout').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const SettingsIcon = dynamic(
  () => import('@mui/icons-material/Settings').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const EditIcon = dynamic(
  () => import('@mui/icons-material/Edit').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const DeleteIcon = dynamic(
  () => import('@mui/icons-material/Delete').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const SendIcon = dynamic(
  () => import('@mui/icons-material/Send').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const FavoriteIcon = dynamic(
  () => import('@mui/icons-material/Favorite').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const FavoriteBorderIcon = dynamic(
  () => import('@mui/icons-material/FavoriteBorder').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const CommentIcon = dynamic(
  () => import('@mui/icons-material/Comment').then(mod => ({ default: mod.default })),
  { ssr: false }
);

export const CloseIcon = dynamic(
  () => import('@mui/icons-material/Close').then(mod => ({ default: mod.default })),
  { ssr: false }
);

// デバッグログ
if (process.env.NODE_ENV === 'development') {
  console.log('[PERF] LazyMUI: Material-UI components configured for dynamic import');
}