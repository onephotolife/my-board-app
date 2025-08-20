'use client';

import { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Typography,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  CircularProgress,
  Box,
  Chip,
  LinearProgress,
} from '@mui/material';
import {
  Email as EmailIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  Support as SupportIcon,
} from '@mui/icons-material';

interface EmailResendButtonProps {
  email: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

interface ResendResponse {
  success: boolean;
  message: string;
  data?: {
    cooldownSeconds?: number;
    retriesRemaining?: number;
    attemptNumber?: number;
    checkSpamFolder?: boolean;
    supportAvailable?: boolean;
    supportEmail?: string;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

const RESEND_REASONS = [
  { value: 'not_received', label: 'メールが届いていない' },
  { value: 'expired', label: 'リンクの有効期限が切れた' },
  { value: 'spam_folder', label: '迷惑メールフォルダに入っている可能性' },
  { value: 'other', label: 'その他の理由' },
];

export default function EmailResendButton({
  email,
  disabled = false,
  onSuccess,
  onError,
}: EmailResendButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const [reason, setReason] = useState('not_received');
  const [cooldown, setCooldown] = useState(0);
  const [response, setResponse] = useState<ResendResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // クールダウンタイマー
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setInterval(() => {
        setCooldown((prev) => Math.max(0, prev - 1));
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [cooldown]);

  // ローカルストレージからクールダウン状態を復元
  useEffect(() => {
    const savedCooldown = localStorage.getItem(`resend_cooldown_${email}`);
    if (savedCooldown) {
      const remaining = Math.max(0, parseInt(savedCooldown) - Date.now());
      setCooldown(Math.ceil(remaining / 1000));
    }
  }, [email]);

  const handleOpen = () => {
    setOpen(true);
    setActiveStep(0);
    setResponse(null);
    setError(null);
  };

  const handleClose = () => {
    if (!loading) {
      setOpen(false);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleResend = async () => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          reason,
        }),
      });

      const data: ResendResponse = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || 'メール再送信に失敗しました');
      }

      setResponse(data);

      // クールダウン設定
      if (data.data?.cooldownSeconds) {
        const cooldownUntil = Date.now() + data.data.cooldownSeconds * 1000;
        localStorage.setItem(`resend_cooldown_${email}`, cooldownUntil.toString());
        setCooldown(data.data.cooldownSeconds);
      }

      // 成功ステップへ
      setActiveStep(2);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('メール再送信エラー:', err);
      setError(err.message);
      
      if (onError) {
        onError(err);
      }
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins > 0) {
      return `${mins}分${secs}秒`;
    }
    return `${secs}秒`;
  };

  const isButtonDisabled = disabled || cooldown > 0 || loading;

  return (
    <>
      <Button
        variant="outlined"
        color="primary"
        onClick={handleOpen}
        disabled={isButtonDisabled}
        startIcon={<EmailIcon />}
        fullWidth
      >
        {cooldown > 0 
          ? `再送信可能まで ${formatTime(cooldown)}`
          : '確認メールを再送信'
        }
      </Button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        disableEscapeKeyDown={loading}
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" gap={1}>
            <EmailIcon color="primary" />
            <Typography variant="h6">確認メールの再送信</Typography>
          </Box>
        </DialogTitle>

        <DialogContent>
          <Stepper activeStep={activeStep} orientation="vertical">
            {/* Step 1: 理由選択 */}
            <Step>
              <StepLabel>再送信の理由を選択</StepLabel>
              <StepContent>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  問題解決のため、再送信の理由をお聞かせください。
                </Typography>
                <RadioGroup
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                >
                  {RESEND_REASONS.map((item) => (
                    <FormControlLabel
                      key={item.value}
                      value={item.value}
                      control={<Radio />}
                      label={item.label}
                    />
                  ))}
                </RadioGroup>
                <Box mt={2}>
                  <Button
                    variant="contained"
                    onClick={handleNext}
                    disabled={!reason}
                  >
                    次へ
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 2: 確認と送信 */}
            <Step>
              <StepLabel>確認と送信</StepLabel>
              <StepContent>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="body2">
                    <strong>{email}</strong> 宛に確認メールを再送信します。
                  </Typography>
                </Alert>

                {reason === 'spam_folder' && (
                  <Alert severity="warning" sx={{ mt: 2 }}>
                    迷惑メールフォルダをご確認ください。
                    メールが見つからない場合は、送信元アドレスを
                    信頼できる送信者として登録してください。
                  </Alert>
                )}

                {error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {error}
                  </Alert>
                )}

                <Box mt={2} display="flex" gap={1}>
                  <Button onClick={handleBack} disabled={loading}>
                    戻る
                  </Button>
                  <Button
                    variant="contained"
                    onClick={handleResend}
                    disabled={loading}
                    startIcon={loading ? <CircularProgress size={20} /> : <EmailIcon />}
                  >
                    {loading ? '送信中...' : 'メールを再送信'}
                  </Button>
                </Box>
              </StepContent>
            </Step>

            {/* Step 3: 完了 */}
            <Step>
              <StepLabel>送信完了</StepLabel>
              <StepContent>
                {response?.success ? (
                  <>
                    <Alert
                      severity="success"
                      icon={<CheckCircleIcon />}
                      sx={{ mb: 2 }}
                    >
                      {response.message}
                    </Alert>

                    {response.data && (
                      <Box sx={{ mb: 2 }}>
                        {response.data.attemptNumber && (
                          <Chip
                            label={`送信回数: ${response.data.attemptNumber}回目`}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                        )}
                        {response.data.retriesRemaining !== undefined && (
                          <Chip
                            label={`残り再送信可能回数: ${response.data.retriesRemaining}回`}
                            size="small"
                            color={response.data.retriesRemaining > 0 ? 'default' : 'error'}
                          />
                        )}
                      </Box>
                    )}

                    {response.data?.checkSpamFolder && (
                      <Alert severity="warning" sx={{ mb: 2 }}>
                        メールが届かない場合は、迷惑メールフォルダをご確認ください。
                      </Alert>
                    )}

                    {response.data?.supportAvailable && (
                      <Alert 
                        severity="info" 
                        icon={<SupportIcon />}
                        sx={{ mb: 2 }}
                      >
                        問題が解決しない場合は、
                        {response.data.supportEmail && (
                          <Typography component="span" fontWeight="bold">
                            {' '}{response.data.supportEmail}{' '}
                          </Typography>
                        )}
                        サポートまでお問い合わせください。
                      </Alert>
                    )}

                    <Box mt={2}>
                      <Button
                        variant="contained"
                        onClick={handleClose}
                        fullWidth
                      >
                        閉じる
                      </Button>
                    </Box>
                  </>
                ) : (
                  <Alert severity="error" icon={<ErrorIcon />}>
                    メールの再送信に失敗しました。
                    しばらく待ってから再度お試しください。
                  </Alert>
                )}
              </StepContent>
            </Step>
          </Stepper>

          {/* プログレスバー */}
          {loading && (
            <LinearProgress sx={{ mt: 2 }} />
          )}
        </DialogContent>

        {activeStep === 0 && (
          <DialogActions>
            <Button onClick={handleClose}>
              キャンセル
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}