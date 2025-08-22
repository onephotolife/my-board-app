'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Alert,
  CircularProgress,
  Chip,
  Stack,
  Tab,
  Tabs,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Badge,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from '@mui/material';
import {
  Report as ReportIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  Block as BlockIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  Flag as FlagIcon,
  TrendingUp as TrendingUpIcon,
  AccessTime as AccessTimeIcon,
  AssignmentTurnedIn as AssignmentTurnedInIcon,
  PendingActions as PendingActionsIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';

interface Report {
  _id: string;
  postId: {
    _id: string;
    title: string;
    content: string;
    author: {
      _id: string;
      name: string;
      email: string;
    };
    status: string;
  };
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reason: string;
  description: string;
  status: string;
  moderatorNotes?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: string;
  action?: string;
  createdAt: string;
  updatedAt: string;
}

interface Stats {
  _id: string;
  count: number;
  pending: number;
}

const REASON_LABELS: Record<string, string> = {
  spam: 'スパム',
  inappropriate: '不適切な内容',
  harassment: 'ハラスメント',
  misinformation: '誤情報',
  other: 'その他',
};

const STATUS_LABELS: Record<string, string> = {
  pending: '未処理',
  reviewing: '確認中',
  resolved: '解決済み',
  dismissed: '却下',
};

const ACTION_LABELS: Record<string, string> = {
  none: 'なし',
  warning: '警告',
  delete: '削除',
  ban: 'BAN',
};

export default function ModerationDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModerator, setIsModerator] = useState(false);
  const [tabValue, setTabValue] = useState('pending');
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolveAction, setResolveAction] = useState('none');
  const [moderatorNotes, setModeratorNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchReports();
    }
  }, [status, tabValue]);

  const fetchReports = async () => {
    setLoading(true);
    setError('');

    try {
      const params = new URLSearchParams({
        status: tabValue === 'all' ? 'all' : tabValue,
      });

      const response = await fetch(`/api/reports?${params}`);
      const data = await response.json();

      if (data.success) {
        setReports(data.data);
        setStats(data.stats || []);
        setIsModerator(data.isModerator);
        
        if (!data.isModerator) {
          setError('モデレーター権限がありません');
        }
      } else {
        setError(data.error?.message || '通報の取得に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (status: 'resolved' | 'dismissed') => {
    if (!selectedReport) return;

    setResolving(true);
    setError('');

    try {
      const response = await fetch(`/api/reports/${selectedReport._id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status,
          action: resolveAction,
          moderatorNotes,
        }),
      });

      const data = await response.json();

      if (data.success) {
        await fetchReports();
        setResolveDialogOpen(false);
        setSelectedReport(null);
        setResolveAction('none');
        setModeratorNotes('');
      } else {
        setError(data.error?.message || '通報の処理に失敗しました');
      }
    } catch (err) {
      setError('ネットワークエラーが発生しました');
    } finally {
      setResolving(false);
    }
  };

  const handleOpenResolveDialog = (report: Report) => {
    setSelectedReport(report);
    setResolveDialogOpen(true);
  };

  const handleCloseResolveDialog = () => {
    setResolveDialogOpen(false);
    setSelectedReport(null);
    setResolveAction('none');
    setModeratorNotes('');
  };

  if (status === 'loading' || loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (status === 'unauthenticated') {
    router.push('/auth/signin');
    return null;
  }

  if (!isModerator) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="error">
          モデレーター権限がありません。このページにアクセスする権限がありません。
        </Alert>
      </Container>
    );
  }

  const pendingCount = reports.filter(r => r.status === 'pending').length;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 2 }}>
          モデレーションダッシュボード
        </Typography>
        
        {/* 統計カード */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <PendingActionsIcon color="warning" />
                  <Typography variant="h6" sx={{ ml: 1 }}>
                    未処理
                  </Typography>
                </Box>
                <Typography variant="h3" color="warning.main">
                  {pendingCount}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          {stats.map((stat) => (
            <Grid item xs={12} md={3} key={stat._id}>
              <Card>
                <CardContent>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    {REASON_LABELS[stat._id] || stat._id}
                  </Typography>
                  <Typography variant="h4">
                    {stat.count}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    未処理: {stat.pending}件
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* タブ */}
        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabValue}
            onChange={(_, value) => setTabValue(value)}
            variant="fullWidth"
          >
            <Tab
              label="未処理"
              value="pending"
              icon={<Badge badgeContent={pendingCount} color="error" />}
            />
            <Tab label="確認中" value="reviewing" />
            <Tab label="解決済み" value="resolved" />
            <Tab label="却下" value="dismissed" />
            <Tab label="すべて" value="all" />
          </Tabs>
        </Paper>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* 通報リスト */}
        <List>
          {reports.map((report) => (
            <Paper key={report._id} sx={{ mb: 2 }}>
              <ListItem alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'error.main' }}>
                    <ReportIcon />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1">
                        {report.postId?.title || '削除済みの投稿'}
                      </Typography>
                      <Chip
                        label={REASON_LABELS[report.reason]}
                        size="small"
                        color="error"
                        variant="outlined"
                      />
                      <Chip
                        label={STATUS_LABELS[report.status]}
                        size="small"
                        color={report.status === 'pending' ? 'warning' : 'default'}
                      />
                    </Box>
                  }
                  secondary={
                    <Box sx={{ mt: 1 }}>
                      <Typography variant="body2" sx={{ mb: 1 }}>
                        {report.description}
                      </Typography>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="caption" color="text.secondary">
                          通報者: {report.reportedBy.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          投稿者: {report.postId?.author?.name || '不明'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {format(new Date(report.createdAt), 'yyyy/MM/dd HH:mm', { locale: ja })}
                        </Typography>
                      </Stack>
                      {report.resolvedBy && (
                        <Box sx={{ mt: 1 }}>
                          <Typography variant="caption" color="success.main">
                            解決者: {report.resolvedBy.name} - {report.action && ACTION_LABELS[report.action]}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  }
                />
                <ListItemSecondaryAction>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      onClick={() => router.push(`/posts/${report.postId?._id}`)}
                      disabled={!report.postId}
                    >
                      <VisibilityIcon />
                    </IconButton>
                    {report.status === 'pending' && (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => handleOpenResolveDialog(report)}
                      >
                        処理
                      </Button>
                    )}
                  </Stack>
                </ListItemSecondaryAction>
              </ListItem>
            </Paper>
          ))}
        </List>

        {reports.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              {tabValue === 'pending' ? '未処理の通報はありません' : '通報がありません'}
            </Typography>
          </Paper>
        )}
      </Box>

      {/* 解決ダイアログ */}
      <Dialog open={resolveDialogOpen} onClose={handleCloseResolveDialog} maxWidth="sm" fullWidth>
        <DialogTitle>通報の処理</DialogTitle>
        <DialogContent>
          {selectedReport && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2" gutterBottom>
                投稿: {selectedReport.postId?.title || '削除済み'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                通報理由: {REASON_LABELS[selectedReport.reason]}
              </Typography>
              <Typography variant="body2" sx={{ mb: 3 }}>
                {selectedReport.description}
              </Typography>
              
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>アクション</InputLabel>
                <Select
                  value={resolveAction}
                  onChange={(e) => setResolveAction(e.target.value)}
                  label="アクション"
                >
                  <MenuItem value="none">なし（警告なし）</MenuItem>
                  <MenuItem value="warning">警告を送信</MenuItem>
                  <MenuItem value="delete">投稿を削除</MenuItem>
                  <MenuItem value="ban">ユーザーをBAN</MenuItem>
                </Select>
              </FormControl>
              
              <TextField
                fullWidth
                multiline
                rows={3}
                label="モデレーターメモ（任意）"
                value={moderatorNotes}
                onChange={(e) => setModeratorNotes(e.target.value)}
                placeholder="処理の詳細や理由を記載..."
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseResolveDialog} disabled={resolving}>
            キャンセル
          </Button>
          <Button
            onClick={() => handleResolve('dismissed')}
            color="warning"
            disabled={resolving}
          >
            却下
          </Button>
          <Button
            onClick={() => handleResolve('resolved')}
            variant="contained"
            disabled={resolving}
          >
            解決
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}