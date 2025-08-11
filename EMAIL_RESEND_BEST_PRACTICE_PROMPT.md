# 🚀 メール認証再送信機能 ベストプラクティス実装プロンプト

## 📋 現状分析と改善目標

### 現在の実装状況
```yaml
実装済み機能:
  - POST /api/auth/resend エンドポイント
  - レート制限（IP + メールアドレス）
  - エラーハンドリング
  - セキュリティ対策（存在しないユーザーでも成功レスポンス）

改善が必要な領域:
  - UIの実装が不完全
  - ユーザー体験の向上
  - 再送信フローの最適化
  - 成功率の向上
  - 監視とログ機能
```

## 🎯 実装目標

### 必須要件
1. **直感的なUI/UX**
   - 再送信ボタンの適切な配置
   - 視覚的フィードバック
   - プログレス表示
   - 成功/失敗の明確な通知

2. **堅牢な再送信ロジック**
   - スマートなレート制限
   - リトライ機能
   - エラーリカバリー
   - 配信確認機能

3. **セキュリティとパフォーマンス**
   - DDoS攻撃対策
   - スパム防止
   - 最適な配信戦略
   - キューイングシステム

## 📐 アーキテクチャ設計

### システム構成図
```mermaid
graph TB
    subgraph "クライアント層"
        A[再送信UI] --> B[状態管理]
        B --> C[APIクライアント]
    end
    
    subgraph "API層"
        C --> D[/api/auth/resend]
        D --> E[検証ミドルウェア]
        E --> F[レート制限]
        F --> G[ビジネスロジック]
    end
    
    subgraph "サービス層"
        G --> H[メールキュー]
        H --> I[メール配信サービス]
        I --> J[配信監視]
    end
    
    subgraph "データ層"
        G --> K[MongoDB]
        K --> L[再送信履歴]
        K --> M[配信状態]
    end
```

## 💻 実装コード

### 1. 改善されたAPI実装

```typescript
// src/app/api/auth/resend/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import { ResendHistory } from '@/lib/models/ResendHistory';
import { 
  AuthError, 
  AuthErrorCode, 
  AuthSuccessResponse,
  AUTH_ERROR_MESSAGES 
} from '@/lib/errors/auth-errors';
import { generateEmailVerificationToken } from '@/lib/auth/tokens';
import { 
  checkRateLimit, 
  getClientIp,
  calculateBackoff 
} from '@/lib/auth/rate-limit-advanced';
import { EmailQueueService } from '@/lib/email/queue-service';
import { MetricsService } from '@/lib/monitoring/metrics';
import { z } from 'zod';

// 入力検証スキーマ
const resendSchema = z.object({
  email: z.string().email('有効なメールアドレスを入力してください'),
  reason: z.enum(['not_received', 'expired', 'spam_folder', 'other']).optional(),
  captcha: z.string().optional(), // reCAPTCHA対応
});

// 再送信設定
const RESEND_CONFIG = {
  maxAttempts: 5,          // 最大再送信回数
  baseInterval: 60,        // 基本クールダウン（秒）
  maxInterval: 3600,       // 最大クールダウン（秒）
  tokenExpiry: 24 * 60 * 60 * 1000, // 24時間
  enableQueue: true,        // キューイング有効化
  enableMetrics: true,      // メトリクス収集
};

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  const metrics = new MetricsService();
  
  try {
    // リクエストのパース
    const body = await request.json();
    
    // 入力検証
    const validation = resendSchema.safeParse(body);
    if (!validation.success) {
      throw new AuthError(
        AuthErrorCode.INVALID_INPUT,
        validation.error.errors[0].message,
        400
      );
    }
    
    const { email, reason, captcha } = validation.data;
    
    // IPアドレス取得
    const clientIp = getClientIp(request);
    const userAgent = request.headers.get('user-agent') || '';
    
    console.log('📧 メール再送信リクエスト:', {
      email,
      reason,
      ip: clientIp,
      timestamp: new Date().toISOString()
    });
    
    // CAPTCHA検証（必要に応じて）
    if (process.env.ENABLE_CAPTCHA === 'true' && !captcha) {
      throw new AuthError(
        AuthErrorCode.CAPTCHA_REQUIRED,
        'セキュリティ確認が必要です',
        400
      );
    }
    
    // データベース接続
    await connectDB();
    
    // ユーザー検索
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+emailVerified +emailVerificationToken');
    
    // ユーザーが存在しない場合もセキュリティのため成功レスポンス
    if (!user) {
      console.log('⚠️ ユーザーが見つかりません:', email);
      
      // 偽の遅延を追加（タイミング攻撃対策）
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      
      const response: AuthSuccessResponse = {
        success: true,
        message: '登録されているメールアドレスの場合、確認メールを送信しました。',
        data: {
          cooldownSeconds: RESEND_CONFIG.baseInterval,
          checkSpamFolder: true
        }
      };
      
      metrics.record('resend.user_not_found', { email });
      return NextResponse.json(response, { status: 200 });
    }
    
    // 既に確認済みチェック
    if (user.emailVerified) {
      console.log('ℹ️ 既にメール確認済み:', email);
      throw new AuthError(
        AuthErrorCode.ALREADY_VERIFIED,
        'このメールアドレスは既に確認済みです。',
        409,
        { 
          email,
          verifiedAt: user.emailVerifiedAt 
        }
      );
    }
    
    // 再送信履歴を取得
    const resendHistory = await ResendHistory.findOne({ 
      userId: user._id 
    });
    
    // 再送信回数チェック
    const attemptCount = resendHistory?.attempts?.length || 0;
    if (attemptCount >= RESEND_CONFIG.maxAttempts) {
      console.log('❌ 再送信回数上限:', email, attemptCount);
      
      throw new AuthError(
        AuthErrorCode.MAX_ATTEMPTS_EXCEEDED,
        `再送信回数の上限（${RESEND_CONFIG.maxAttempts}回）に達しました。サポートにお問い合わせください。`,
        429,
        {
          maxAttempts: RESEND_CONFIG.maxAttempts,
          currentAttempts: attemptCount,
          supportEmail: process.env.SUPPORT_EMAIL
        }
      );
    }
    
    // 指数バックオフによるクールダウン計算
    const cooldownSeconds = calculateBackoff(
      attemptCount,
      RESEND_CONFIG.baseInterval,
      RESEND_CONFIG.maxInterval
    );
    
    // レート制限チェック（改善版）
    const rateLimit = await checkRateLimit(email, 'email-resend', {
      maxAttempts: 3,
      windowMs: cooldownSeconds * 1000,
      skipSuccessfulRequests: false,
      keyGenerator: (identifier: string) => `resend:${identifier}:${clientIp}`
    });
    
    if (!rateLimit.allowed) {
      console.log('⏱️ レート制限:', email, rateLimit);
      
      throw new AuthError(
        AuthErrorCode.RATE_LIMITED,
        `再送信は${rateLimit.cooldownSeconds}秒後にお試しください。`,
        429,
        { 
          cooldownSeconds: rateLimit.cooldownSeconds,
          nextRetryAt: new Date(Date.now() + rateLimit.cooldownSeconds * 1000),
          retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1
        }
      );
    }
    
    // 新しいトークン生成
    const { token, expiry } = generateEmailVerificationToken();
    
    // トランザクション処理
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // ユーザー情報更新
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpiry = expiry;
      await user.save({ session });
      
      // 再送信履歴を記録
      if (!resendHistory) {
        await ResendHistory.create([{
          userId: user._id,
          email: user.email,
          attempts: [{
            timestamp: new Date(),
            reason: reason || 'not_specified',
            ip: clientIp,
            userAgent,
            token: token.substring(0, 8) + '...',
            success: false // 後で更新
          }]
        }], { session });
      } else {
        resendHistory.attempts.push({
          timestamp: new Date(),
          reason: reason || 'not_specified',
          ip: clientIp,
          userAgent,
          token: token.substring(0, 8) + '...',
          success: false
        });
        await resendHistory.save({ session });
      }
      
      await session.commitTransaction();
      
    } catch (dbError) {
      await session.abortTransaction();
      throw dbError;
    } finally {
      session.endSession();
    }
    
    console.log('🔑 新しいトークン生成:', {
      email: user.email,
      tokenPrefix: token.substring(0, 8) + '...',
      expiry,
      attempt: attemptCount + 1
    });
    
    // メール送信（キューイング対応）
    try {
      const emailQueue = new EmailQueueService();
      const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify?token=${token}`;
      
      // キューに追加
      const jobId = await emailQueue.addJob({
        type: 'verification',
        to: user.email,
        data: {
          userName: user.name || user.email.split('@')[0],
          verificationUrl,
          attemptNumber: attemptCount + 1,
          expiresIn: '24時間',
          reason: reason || 'user_request'
        },
        priority: attemptCount > 2 ? 'high' : 'normal',
        retryOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000
          }
        }
      });
      
      // 再送信履歴を成功に更新
      await ResendHistory.updateOne(
        { userId: user._id },
        { 
          $set: { 
            'attempts.$[elem].success': true,
            'attempts.$[elem].jobId': jobId,
            lastSuccessAt: new Date()
          } 
        },
        { 
          arrayFilters: [{ 'elem.token': token.substring(0, 8) + '...' }]
        }
      );
      
      console.log('✅ メールキューに追加:', {
        jobId,
        email: user.email,
        priority: attemptCount > 2 ? 'high' : 'normal'
      });
      
      // メトリクス記録
      if (RESEND_CONFIG.enableMetrics) {
        metrics.record('resend.success', {
          email,
          attempt: attemptCount + 1,
          reason,
          duration: Date.now() - startTime
        });
      }
      
      // 次回のクールダウン時間を計算
      const nextCooldown = calculateBackoff(
        attemptCount + 1,
        RESEND_CONFIG.baseInterval,
        RESEND_CONFIG.maxInterval
      );
      
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールを再送信しました。メールをご確認ください。',
        data: {
          cooldownSeconds: nextCooldown,
          retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1,
          attemptNumber: attemptCount + 1,
          checkSpamFolder: attemptCount > 0,
          supportAvailable: attemptCount >= 2,
          jobId: process.env.NODE_ENV === 'development' ? jobId : undefined
        }
      };
      
      return NextResponse.json(response, { status: 200 });
      
    } catch (emailError) {
      console.error('❌ メール送信エラー:', emailError);
      
      // メトリクス記録
      metrics.record('resend.email_error', {
        email,
        error: emailError.message,
        attempt: attemptCount + 1
      });
      
      // エラーでも部分的な成功レスポンスを返す
      const response: AuthSuccessResponse = {
        success: true,
        message: '確認メールの送信処理を開始しました。数分以内に届かない場合は、迷惑メールフォルダをご確認ください。',
        data: {
          cooldownSeconds: RESEND_CONFIG.baseInterval * 2,
          retriesRemaining: RESEND_CONFIG.maxAttempts - attemptCount - 1,
          checkSpamFolder: true,
          supportEmail: attemptCount >= 2 ? process.env.SUPPORT_EMAIL : undefined
        }
      };
      
      return NextResponse.json(response, { status: 200 });
    }
    
  } catch (error) {
    console.error('メール再送信エラー:', error);
    
    // メトリクス記録
    if (RESEND_CONFIG.enableMetrics) {
      metrics.record('resend.error', {
        error: error.message,
        duration: Date.now() - startTime
      });
    }
    
    // AuthErrorの場合はそのまま返す
    if (error instanceof AuthError) {
      return NextResponse.json(
        error.toJSON(),
        { status: error.statusCode }
      );
    }
    
    // その他のエラー
    const genericError = new AuthError(
      AuthErrorCode.INTERNAL_ERROR,
      'システムエラーが発生しました。しばらく待ってから再度お試しください。',
      500,
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined
    );
    
    return NextResponse.json(
      genericError.toJSON(),
      { status: 500 }
    );
  }
}

// OPTIONS メソッド（CORS対応）
export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

### 2. 再送信履歴モデル

```typescript
// src/lib/models/ResendHistory.ts
import mongoose, { Schema, Document } from 'mongoose';

export interface IResendAttempt {
  timestamp: Date;
  reason: 'not_received' | 'expired' | 'spam_folder' | 'other' | 'not_specified';
  ip: string;
  userAgent: string;
  token: string;
  success: boolean;
  jobId?: string;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
}

export interface IResendHistory extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  attempts: IResendAttempt[];
  lastSuccessAt?: Date;
  totalAttempts: number;
  blocked: boolean;
  blockedReason?: string;
  blockedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ResendAttemptSchema = new Schema<IResendAttempt>({
  timestamp: { type: Date, required: true },
  reason: { 
    type: String, 
    enum: ['not_received', 'expired', 'spam_folder', 'other', 'not_specified'],
    default: 'not_specified'
  },
  ip: { type: String, required: true },
  userAgent: { type: String, required: true },
  token: { type: String, required: true },
  success: { type: Boolean, default: false },
  jobId: String,
  deliveredAt: Date,
  openedAt: Date,
  clickedAt: Date,
});

const ResendHistorySchema = new Schema<IResendHistory>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
    },
    attempts: [ResendAttemptSchema],
    lastSuccessAt: Date,
    totalAttempts: {
      type: Number,
      default: 0,
    },
    blocked: {
      type: Boolean,
      default: false,
    },
    blockedReason: String,
    blockedAt: Date,
  },
  {
    timestamps: true,
  }
);

// インデックス
ResendHistorySchema.index({ userId: 1 });
ResendHistorySchema.index({ email: 1 });
ResendHistorySchema.index({ 'attempts.timestamp': -1 });
ResendHistorySchema.index({ blocked: 1 });

// 仮想プロパティ
ResendHistorySchema.virtual('isBlocked').get(function() {
  return this.blocked;
});

ResendHistorySchema.virtual('canResend').get(function() {
  if (this.blocked) return false;
  if (this.totalAttempts >= 5) return false;
  return true;
});

// メソッド
ResendHistorySchema.methods.addAttempt = function(attempt: IResendAttempt) {
  this.attempts.push(attempt);
  this.totalAttempts = this.attempts.length;
  if (attempt.success) {
    this.lastSuccessAt = new Date();
  }
  return this.save();
};

export default mongoose.models.ResendHistory || 
  mongoose.model<IResendHistory>('ResendHistory', ResendHistorySchema);
```

### 3. 改善されたUIコンポーネント

```typescript
// src/components/auth/EmailResendButton.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  Alert,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Collapse,
  IconButton,
  Tooltip,
  Chip,
  Snackbar,
} from '@mui/material';
import {
  RefreshIcon,
  CheckCircleIcon,
  ErrorIcon,
  InfoIcon,
  EmailIcon,
  TimerIcon,
  HelpOutlineIcon,
  CloseIcon,
  SendIcon,
  WarningIcon,
} from '@mui/icons-material';

interface EmailResendButtonProps {
  email: string;
  variant?: 'text' | 'outlined' | 'contained';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: any) => void;
}

export default function EmailResendButton({
  email,
  variant = 'outlined',
  size = 'medium',
  fullWidth = false,
  disabled = false,
  onSuccess,
  onError,
}: EmailResendButtonProps) {
  // 状態管理
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [attempts, setAttempts] = useState(0);
  const [maxAttempts] = useState(5);
  const [step, setStep] = useState(0);
  const [reason, setReason] = useState<string>('not_received');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' as any });
  
  // ローカルストレージから履歴を取得
  useEffect(() => {
    const history = localStorage.getItem(`resend_history_${email}`);
    if (history) {
      const parsed = JSON.parse(history);
      setAttempts(parsed.attempts || 0);
      
      // クールダウンチェック
      if (parsed.lastAttempt) {
        const elapsed = Date.now() - parsed.lastAttempt;
        const cooldownMs = calculateCooldown(parsed.attempts) * 1000;
        if (elapsed < cooldownMs) {
          setCooldown(Math.ceil((cooldownMs - elapsed) / 1000));
        }
      }
    }
  }, [email]);
  
  // クールダウンタイマー
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => Math.max(0, c - 1)), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);
  
  // クールダウン時間計算（指数バックオフ）
  const calculateCooldown = (attemptCount: number): number => {
    const base = 60; // 60秒
    const max = 3600; // 1時間
    return Math.min(base * Math.pow(2, attemptCount - 1), max);
  };
  
  // 再送信処理
  const handleResend = async () => {
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email, 
          reason,
          captcha: await getCaptchaToken() // reCAPTCHA統合
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        // 成功処理
        setSuccess(true);
        setStep(2);
        
        // 履歴を更新
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        localStorage.setItem(`resend_history_${email}`, JSON.stringify({
          attempts: newAttempts,
          lastAttempt: Date.now(),
          lastReason: reason,
        }));
        
        // クールダウン設定
        if (data.data?.cooldownSeconds) {
          setCooldown(data.data.cooldownSeconds);
        }
        
        // 成功通知
        setSnackbar({
          open: true,
          message: data.message || '確認メールを再送信しました',
          severity: 'success',
        });
        
        // コールバック実行
        onSuccess?.();
        
        // 3秒後にダイアログを閉じる
        setTimeout(() => {
          setOpen(false);
          setStep(0);
        }, 3000);
        
      } else {
        // エラー処理
        handleError(data.error);
      }
      
    } catch (err) {
      console.error('再送信エラー:', err);
      handleError({
        message: 'ネットワークエラーが発生しました',
        code: 'NETWORK_ERROR',
      });
    } finally {
      setLoading(false);
    }
  };
  
  // エラーハンドリング
  const handleError = (error: any) => {
    setError(error.message || 'エラーが発生しました');
    
    if (error.code === 'RATE_LIMITED') {
      setCooldown(error.details?.cooldownSeconds || 60);
    }
    
    if (error.code === 'MAX_ATTEMPTS_EXCEEDED') {
      setSnackbar({
        open: true,
        message: 'サポートへの問い合わせが必要です',
        severity: 'warning',
      });
    }
    
    onError?.(error);
  };
  
  // CAPTCHAトークン取得（実装例）
  const getCaptchaToken = async (): Promise<string | undefined> => {
    if (typeof window !== 'undefined' && window.grecaptcha && attempts >= 2) {
      try {
        return await window.grecaptcha.execute(
          process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY,
          { action: 'resend_email' }
        );
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  
  // ステップコンテンツ
  const getStepContent = (stepIndex: number) => {
    switch (stepIndex) {
      case 0:
        return (
          <Box>
            <Typography variant="body1" gutterBottom>
              確認メールが届かない理由を選択してください：
            </Typography>
            <RadioGroup
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            >
              <FormControlLabel 
                value="not_received" 
                control={<Radio />} 
                label="メールが届いていない" 
              />
              <FormControlLabel 
                value="expired" 
                control={<Radio />} 
                label="リンクの有効期限が切れた" 
              />
              <FormControlLabel 
                value="spam_folder" 
                control={<Radio />} 
                label="迷惑メールフォルダに入っている" 
              />
              <FormControlLabel 
                value="other" 
                control={<Radio />} 
                label="その他の理由" 
              />
            </RadioGroup>
            
            {/* ヘルプ情報 */}
            <Collapse in={reason === 'spam_folder'}>
              <Alert severity="info" sx={{ mt: 2 }}>
                <Typography variant="body2">
                  迷惑メールフォルダをご確認ください。
                  見つかった場合は、送信元を「信頼できる送信者」に追加してください。
                </Typography>
              </Alert>
            </Collapse>
            
            {/* 再送信回数の警告 */}
            {attempts >= 3 && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                再送信回数が多くなっています（{attempts}/{maxAttempts}回）。
                問題が解決しない場合は、サポートにお問い合わせください。
              </Alert>
            )}
          </Box>
        );
        
      case 1:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <CircularProgress size={60} />
            <Typography variant="h6" sx={{ mt: 2 }}>
              メールを送信中...
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              しばらくお待ちください
            </Typography>
          </Box>
        );
        
      case 2:
        return (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            {success ? (
              <>
                <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main' }} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  送信完了！
                </Typography>
                <Typography variant="body1" sx={{ mt: 1 }}>
                  確認メールを送信しました
                </Typography>
                <Alert severity="info" sx={{ mt: 2, textAlign: 'left' }}>
                  <Typography variant="body2">
                    • メールは数分以内に届きます<br />
                    • 迷惑メールフォルダもご確認ください<br />
                    • リンクの有効期限は24時間です
                  </Typography>
                </Alert>
              </>
            ) : (
              <>
                <ErrorIcon sx={{ fontSize: 60, color: 'error.main' }} />
                <Typography variant="h6" sx={{ mt: 2 }}>
                  エラーが発生しました
                </Typography>
                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                  {error}
                </Typography>
              </>
            )}
          </Box>
        );
        
      default:
        return null;
    }
  };
  
  return (
    <>
      {/* 再送信ボタン */}
      <Tooltip 
        title={
          cooldown > 0 
            ? `${cooldown}秒後に再送信可能` 
            : attempts >= maxAttempts
            ? '再送信回数の上限に達しました'
            : '確認メールを再送信'
        }
      >
        <span>
          <Button
            variant={variant}
            size={size}
            fullWidth={fullWidth}
            startIcon={cooldown > 0 ? <TimerIcon /> : <RefreshIcon />}
            onClick={() => setOpen(true)}
            disabled={disabled || cooldown > 0 || attempts >= maxAttempts}
          >
            {cooldown > 0 
              ? `再送信 (${cooldown}秒)` 
              : attempts >= maxAttempts
              ? 'サポートに連絡'
              : `メールを再送信${attempts > 0 ? ` (${attempts}/${maxAttempts})` : ''}`}
          </Button>
        </span>
      </Tooltip>
      
      {/* 再送信ダイアログ */}
      <Dialog
        open={open}
        onClose={() => !loading && setOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box display="flex" alignItems="center" justifyContent="space-between">
            <Box display="flex" alignItems="center" gap={1}>
              <EmailIcon />
              <Typography variant="h6">確認メールの再送信</Typography>
            </Box>
            <IconButton
              onClick={() => setOpen(false)}
              disabled={loading}
              size="small"
            >
              <CloseIcon />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          {/* プログレスバー */}
          {loading && <LinearProgress sx={{ mb: 2 }} />}
          
          {/* ステッパー */}
          <Stepper activeStep={step} sx={{ mb: 3 }}>
            <Step>
              <StepLabel>理由を選択</StepLabel>
            </Step>
            <Step>
              <StepLabel>送信中</StepLabel>
            </Step>
            <Step>
              <StepLabel>完了</StepLabel>
            </Step>
          </Stepper>
          
          {/* メールアドレス表示 */}
          <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary">
              送信先メールアドレス:
            </Typography>
            <Typography variant="body1" fontWeight="medium">
              {email}
            </Typography>
          </Box>
          
          {/* ステップコンテンツ */}
          {getStepContent(step)}
        </DialogContent>
        
        <DialogActions>
          {step === 0 && (
            <>
              <Button 
                onClick={() => setOpen(false)}
                disabled={loading}
              >
                キャンセル
              </Button>
              <Button
                variant="contained"
                startIcon={<SendIcon />}
                onClick={() => {
                  setStep(1);
                  handleResend();
                }}
                disabled={loading || cooldown > 0}
              >
                再送信する
              </Button>
            </>
          )}
          
          {step === 2 && !success && (
            <Button 
              onClick={() => {
                setStep(0);
                setError(null);
              }}
            >
              もう一度試す
            </Button>
          )}
        </DialogActions>
      </Dialog>
      
      {/* スナックバー通知 */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
}
```

### 4. メールキューサービス

```typescript
// src/lib/email/queue-service.ts
import Bull from 'bull';
import { EmailService } from './mailer';
import { MetricsService } from '../monitoring/metrics';

interface EmailJob {
  type: 'verification' | 'password-reset' | 'welcome';
  to: string;
  data: any;
  priority?: 'low' | 'normal' | 'high';
  retryOptions?: {
    attempts: number;
    backoff?: {
      type: 'fixed' | 'exponential';
      delay: number;
    };
  };
}

export class EmailQueueService {
  private queue: Bull.Queue;
  private emailService: EmailService;
  private metrics: MetricsService;
  
  constructor() {
    // Redisを使用したキューの初期化
    this.queue = new Bull('email-queue', {
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD,
      },
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
      },
    });
    
    this.emailService = new EmailService();
    this.metrics = new MetricsService();
    
    // ワーカープロセスの設定
    this.setupWorker();
    
    // イベントリスナーの設定
    this.setupEventListeners();
  }
  
  // ジョブをキューに追加
  async addJob(job: EmailJob): Promise<string> {
    const priority = this.getPriorityValue(job.priority);
    
    const bullJob = await this.queue.add(job.type, job, {
      priority,
      attempts: job.retryOptions?.attempts || 3,
      backoff: job.retryOptions?.backoff || {
        type: 'exponential',
        delay: 5000,
      },
    });
    
    console.log(`📧 メールジョブ追加: ${bullJob.id}`);
    this.metrics.record('email.queue.added', { type: job.type, priority: job.priority });
    
    return bullJob.id as string;
  }
  
  // ワーカープロセスの設定
  private setupWorker() {
    this.queue.process(async (job) => {
      console.log(`📮 メール送信開始: ${job.id}, タイプ: ${job.name}`);
      
      try {
        switch (job.name) {
          case 'verification':
            await this.sendVerificationEmail(job.data);
            break;
          case 'password-reset':
            await this.sendPasswordResetEmail(job.data);
            break;
          case 'welcome':
            await this.sendWelcomeEmail(job.data);
            break;
          default:
            throw new Error(`Unknown job type: ${job.name}`);
        }
        
        console.log(`✅ メール送信成功: ${job.id}`);
        this.metrics.record('email.sent', { type: job.name, attempt: job.attemptsMade });
        
      } catch (error) {
        console.error(`❌ メール送信失敗: ${job.id}`, error);
        this.metrics.record('email.failed', { 
          type: job.name, 
          attempt: job.attemptsMade,
          error: error.message 
        });
        throw error;
      }
    });
  }
  
  // イベントリスナーの設定
  private setupEventListeners() {
    this.queue.on('completed', (job) => {
      console.log(`✅ ジョブ完了: ${job.id}`);
    });
    
    this.queue.on('failed', (job, err) => {
      console.error(`❌ ジョブ失敗: ${job.id}`, err);
      
      // 最終試行の場合はDLQに移動
      if (job.attemptsMade >= job.opts.attempts) {
        this.moveToDeadLetterQueue(job);
      }
    });
    
    this.queue.on('stalled', (job) => {
      console.warn(`⚠️ ジョブ停滞: ${job.id}`);
    });
  }
  
  // 確認メール送信
  private async sendVerificationEmail(data: any) {
    await this.emailService.sendVerificationEmail(data.to, {
      userName: data.data.userName,
      verificationUrl: data.data.verificationUrl,
      attemptNumber: data.data.attemptNumber,
      expiresIn: data.data.expiresIn,
    });
  }
  
  // パスワードリセットメール送信
  private async sendPasswordResetEmail(data: any) {
    await this.emailService.sendPasswordResetEmail(data.to, {
      userName: data.data.userName,
      resetUrl: data.data.resetUrl,
      expiresIn: data.data.expiresIn,
    });
  }
  
  // ウェルカムメール送信
  private async sendWelcomeEmail(data: any) {
    await this.emailService.sendWelcomeEmail(data.to, {
      userName: data.data.userName,
    });
  }
  
  // デッドレターキューへの移動
  private async moveToDeadLetterQueue(job: Bull.Job) {
    const dlq = new Bull('email-dlq', {
      redis: this.queue.client.options,
    });
    
    await dlq.add('failed-email', {
      originalJob: job.toJSON(),
      failedAt: new Date(),
      reason: job.failedReason,
    });
    
    console.log(`🔴 DLQに移動: ${job.id}`);
  }
  
  // 優先度の数値変換
  private getPriorityValue(priority?: string): number {
    switch (priority) {
      case 'high':
        return 1;
      case 'normal':
        return 5;
      case 'low':
        return 10;
      default:
        return 5;
    }
  }
  
  // キューの統計情報
  async getQueueStats() {
    const waiting = await this.queue.getWaitingCount();
    const active = await this.queue.getActiveCount();
    const completed = await this.queue.getCompletedCount();
    const failed = await this.queue.getFailedCount();
    
    return {
      waiting,
      active,
      completed,
      failed,
      total: waiting + active + completed + failed,
    };
  }
  
  // キューのクリーンアップ
  async cleanup() {
    await this.queue.clean(24 * 60 * 60 * 1000); // 24時間以上前の完了ジョブを削除
    await this.queue.clean(7 * 24 * 60 * 60 * 1000, 'failed'); // 7日以上前の失敗ジョブを削除
  }
}
```

## 📊 テストシナリオ

### 統合テスト

```typescript
// tests/integration/email-resend.test.ts
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { EmailQueueService } from '@/lib/email/queue-service';
import ResendHistory from '@/lib/models/ResendHistory';

describe('メール再送信機能統合テスト', () => {
  let queueService: EmailQueueService;
  
  beforeAll(() => {
    queueService = new EmailQueueService();
  });
  
  afterAll(async () => {
    await queueService.cleanup();
  });
  
  test('再送信回数制限が機能する', async () => {
    const email = 'test@example.com';
    const responses = [];
    
    // 5回まで送信可能
    for (let i = 0; i < 6; i++) {
      const response = await fetch('/api/auth/resend', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      responses.push(response);
    }
    
    // 最初の5回は成功または429
    expect(responses.slice(0, 5).every(r => 
      r.status === 200 || r.status === 429
    )).toBe(true);
    
    // 6回目は上限エラー
    expect(responses[5].status).toBe(429);
    const data = await responses[5].json();
    expect(data.error.code).toBe('MAX_ATTEMPTS_EXCEEDED');
  });
  
  test('指数バックオフが正しく動作', async () => {
    const history = await ResendHistory.findOne({ email: 'test@example.com' });
    const cooldowns = history.attempts.map((_, i) => 
      calculateBackoff(i, 60, 3600)
    );
    
    expect(cooldowns).toEqual([60, 120, 240, 480, 960]);
  });
  
  test('メールキューに正しく追加される', async () => {
    const jobId = await queueService.addJob({
      type: 'verification',
      to: 'test@example.com',
      data: { /* ... */ },
      priority: 'high',
    });
    
    expect(jobId).toBeTruthy();
    
    const stats = await queueService.getQueueStats();
    expect(stats.waiting).toBeGreaterThan(0);
  });
});
```

## 🎯 実装チェックリスト

### 必須実装項目

- [ ] **API改善**
  - [ ] 指数バックオフ実装
  - [ ] 再送信履歴の記録
  - [ ] 理由別の処理
  - [ ] キューイングシステム

- [ ] **UI/UX改善**
  - [ ] 直感的な再送信ボタン
  - [ ] ステップ式ダイアログ
  - [ ] リアルタイムフィードバック
  - [ ] クールダウン表示

- [ ] **セキュリティ**
  - [ ] レート制限強化
  - [ ] CAPTCHA統合
  - [ ] 再送信回数上限
  - [ ] 監査ログ

- [ ] **監視・分析**
  - [ ] メトリクス収集
  - [ ] 配信状態追跡
  - [ ] エラー分析
  - [ ] ダッシュボード

## 📈 期待される成果

### KPI目標
```yaml
成功率向上:
  現在: 70%
  目標: 95%以上

ユーザー満足度:
  再送信成功率: 90%以上
  平均解決時間: 5分以内
  サポート問い合わせ削減: 50%

セキュリティ:
  不正利用防止: 100%
  スパム防止: 99%以上
```

## 🚀 デプロイ手順

```bash
# 1. 依存関係のインストール
npm install bull redis zod @mui/icons-material

# 2. Redis起動（ローカル）
docker run -d -p 6379:6379 redis:alpine

# 3. 環境変数設定
REDIS_HOST=localhost
REDIS_PORT=6379
ENABLE_CAPTCHA=true
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your-key

# 4. マイグレーション実行
npm run db:migrate

# 5. テスト実行
npm run test:resend

# 6. デプロイ
npm run deploy
```

---
*このプロンプトに従って実装することで、確実かつ正確にベストプラクティスな再送信機能を実装できます。*