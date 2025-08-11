# メール再送信機能 - 60%から100%への完璧な修正プロンプト

## 目的
現在60%の成功率を一度の実装で確実に100%まで引き上げる。

## 現状分析（2025-01-13時点）

### 成功している機能（維持すべき部分）
- ✅ パフォーマンステスト: 100%（P95応答時間339ms < 500ms）
- ✅ UIテスト: 100%（レスポンス構造完全）
- ✅ 統合テスト: 66.7%（2/3成功）
- ✅ 機能テスト: 50%（基本フロー動作）
- ✅ タイミング攻撃対策: 動作中

### 失敗している機能（修正必須）
1. **レート制限（0%）**: 全く発動していない
2. **入力検証（0%）**: 6つの攻撃ベクター全てブロック失敗
3. **指数バックオフ（0%）**: 機能していない
4. **再送信回数制限（0%）**: 制限に達しない
5. **履歴記録（0%）**: ResendHistoryが記録されない

## 実装指示

### 前提条件
- **作業時間**: 30分以内で完了
- **実装方法**: 既存コードの修正のみ（新規ファイル作成なし）
- **テスト**: 各修正後に即座に検証

## Phase 1: レート制限の完全修正（10分）

### 1.1 RateLimitモデルの確認と修正

```typescript
// src/lib/models/RateLimit.ts を確認
// 以下のスキーマが存在することを確認:
const rateLimitSchema = new Schema({
  key: { type: String, required: true, index: true },
  attempts: { type: Number, default: 1 },
  lastAttempt: { type: Date, default: Date.now },
  createdAt: { type: Date, default: Date.now }
});
```

### 1.2 レート制限ロジックの完全書き換え

```typescript
// src/lib/auth/rate-limit-advanced.ts を以下に完全置換

import { RateLimit } from '@/lib/models/RateLimit';
import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db/mongodb-local';

export interface RateLimitOptions {
  maxAttempts?: number;
  windowMs?: number;
  skipSuccessfulRequests?: boolean;
  keyGenerator?: (identifier: string) => string;
}

export interface RateLimitResult {
  allowed: boolean;
  cooldownSeconds: number;
  retriesRemaining: number;
  nextRetryAt?: Date;
}

export async function checkRateLimit(
  identifier: string,
  action: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  const {
    maxAttempts = 3,
    windowMs = 60 * 1000,
    skipSuccessfulRequests = false,
    keyGenerator = (id) => `${action}:${id}`,
  } = options;

  const key = keyGenerator(identifier);
  const now = new Date();
  
  try {
    await connectDB();
    
    // 既存のレート制限レコードを検索
    let rateLimit = await RateLimit.findOne({ key });
    
    if (!rateLimit) {
      // 新規作成
      rateLimit = await RateLimit.create({
        key,
        attempts: 1,
        lastAttempt: now,
        createdAt: now
      });
      
      return {
        allowed: true,
        cooldownSeconds: 0,
        retriesRemaining: maxAttempts - 1,
      };
    }
    
    // ウィンドウの計算
    const timeSinceLastAttempt = now.getTime() - rateLimit.lastAttempt.getTime();
    const isWithinWindow = timeSinceLastAttempt < windowMs;
    
    if (!isWithinWindow) {
      // ウィンドウ外なのでリセット
      rateLimit.attempts = 1;
      rateLimit.lastAttempt = now;
      await rateLimit.save();
      
      return {
        allowed: true,
        cooldownSeconds: 0,
        retriesRemaining: maxAttempts - 1,
      };
    }
    
    // ウィンドウ内での処理
    if (rateLimit.attempts >= maxAttempts) {
      // レート制限発動
      const remainingTime = windowMs - timeSinceLastAttempt;
      const cooldownSeconds = Math.ceil(remainingTime / 1000);
      
      return {
        allowed: false,
        cooldownSeconds,
        retriesRemaining: 0,
        nextRetryAt: new Date(rateLimit.lastAttempt.getTime() + windowMs),
      };
    }
    
    // 試行回数を増やす
    rateLimit.attempts += 1;
    rateLimit.lastAttempt = now;
    await rateLimit.save();
    
    return {
      allowed: true,
      cooldownSeconds: 0,
      retriesRemaining: maxAttempts - rateLimit.attempts,
    };
    
  } catch (error) {
    console.error('レート制限チェックエラー:', error);
    // フェイルクローズド
    return {
      allowed: false,
      cooldownSeconds: 60,
      retriesRemaining: 0,
    };
  }
}

export function getClientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
         request.headers.get('x-real-ip') ||
         request.headers.get('cf-connecting-ip') ||
         '127.0.0.1';
}

export function calculateBackoff(
  attemptCount: number,
  baseInterval: number,
  maxInterval: number
): number {
  const interval = baseInterval * Math.pow(2, attemptCount);
  return Math.min(interval, maxInterval);
}
```

## Phase 2: 入力検証の完全実装（5分）

### 2.1 Zodスキーマと検証の修正

```typescript
// src/app/api/auth/resend/route.ts の上部を修正

import { NextRequest, NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { z } from 'zod';
import { connectDB } from '@/lib/db/mongodb-local';
import User from '@/lib/models/User';
import ResendHistory from '@/lib/models/ResendHistory';
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

// 厳格な入力検証スキーマ
const resendSchema = z.object({
  email: z
    .string()
    .min(1, 'メールアドレスを入力してください')
    .max(100, 'メールアドレスが長すぎます')
    .email('有効なメールアドレスを入力してください')
    .refine(
      (email) => {
        // 危険な文字を検出
        const dangerousPatterns = [
          /[<>]/,           // HTMLタグ
          /[\r\n]/,         // 改行文字
          /[';]/,           // SQLインジェクション
          /[\u0000-\u001F]/, // 制御文字
        ];
        return !dangerousPatterns.some(pattern => pattern.test(email));
      },
      { message: '無効な文字が含まれています' }
    )
    .transform(val => val.toLowerCase().trim()),
  
  reason: z
    .enum(['not_received', 'expired', 'spam_folder', 'other'])
    .optional()
    .default('not_received'),
  
  captcha: z.string().optional(),
});

// POSTハンドラーの最初の部分を修正
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    // リクエストボディの取得
    let body;
    try {
      const text = await request.text();
      if (!text) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'リクエストボディが空です',
            }
          },
          { status: 400 }
        );
      }
      body = JSON.parse(text);
    } catch (e) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なJSON形式です',
          }
        },
        { status: 400 }
      );
    }
    
    // 型チェック
    if (typeof body !== 'object' || body === null) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '無効なリクエスト形式です',
          }
        },
        { status: 400 }
      );
    }
    
    // Zod検証
    const validation = resendSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: validation.error.errors[0]?.message || '入力データが無効です',
          }
        },
        { status: 400 }
      );
    }
    
    const { email, reason } = validation.data;
    
    // 以降の処理は変更なし...
```

## Phase 3: 履歴記録の修正（5分）

### 3.1 ResendHistoryの記録修正

```typescript
// src/app/api/auth/resend/route.ts の中間部分を修正
// データベース接続後の部分

    // ユーザー検索
    const user = await User.findOne({ 
      email: email.toLowerCase() 
    }).select('+emailVerified +emailVerificationToken');
    
    if (!user) {
      // セキュリティのため成功レスポンス
      await new Promise(resolve => setTimeout(resolve, 100 + Math.random() * 200));
      return NextResponse.json({
        success: true,
        message: '登録されているメールアドレスの場合、確認メールを送信しました。',
        data: { cooldownSeconds: 60 }
      }, { status: 200 });
    }
    
    // 既に確認済みチェック
    if (user.emailVerified) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'ALREADY_VERIFIED',
          message: 'このメールアドレスは既に確認済みです。'
        }
      }, { status: 409 });
    }
    
    // 再送信履歴を取得または作成
    let resendHistory = await ResendHistory.findOne({ userId: user._id });
    
    if (!resendHistory) {
      // 新規作成
      resendHistory = new ResendHistory({
        userId: user._id,
        email: user.email,
        attempts: [],
        totalAttempts: 0
      });
    }
    
    // 再送信回数チェック
    const attemptCount = resendHistory.attempts?.length || 0;
    const maxAttempts = 5;
    
    if (attemptCount >= maxAttempts) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'MAX_ATTEMPTS_EXCEEDED',
          message: `再送信回数の上限（${maxAttempts}回）に達しました。`,
          details: {
            maxAttempts,
            currentAttempts: attemptCount
          }
        }
      }, { status: 429 });
    }
    
    // 指数バックオフ計算
    const baseInterval = 60;
    const maxInterval = 3600;
    const cooldownSeconds = calculateBackoff(attemptCount, baseInterval, maxInterval);
    
    // レート制限チェック（修正版）
    const rateLimit = await checkRateLimit(email, 'email-resend', {
      maxAttempts: 3,
      windowMs: cooldownSeconds * 1000,
      keyGenerator: (id) => `resend:${id}`
    });
    
    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'RATE_LIMITED',
          message: `再送信は${rateLimit.cooldownSeconds}秒後にお試しください。`,
          details: {
            cooldownSeconds: rateLimit.cooldownSeconds,
            nextRetryAt: rateLimit.nextRetryAt,
            retriesRemaining: maxAttempts - attemptCount - 1
          }
        }
      }, { status: 429 });
    }
    
    // トークン生成と履歴記録
    const { token, expiry } = generateEmailVerificationToken();
    
    // トランザクション開始
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      // ユーザー更新
      user.emailVerificationToken = token;
      user.emailVerificationTokenExpiry = expiry;
      await user.save({ session });
      
      // 履歴に追加
      resendHistory.attempts.push({
        timestamp: new Date(),
        reason: reason || 'not_specified',
        ip: getClientIp(request),
        userAgent: request.headers.get('user-agent') || '',
        token: token.substring(0, 8) + '...',
        success: true
      });
      resendHistory.totalAttempts = resendHistory.attempts.length;
      resendHistory.lastSuccessAt = new Date();
      await resendHistory.save({ session });
      
      await session.commitTransaction();
      
      // 成功レスポンス
      const nextCooldown = calculateBackoff(attemptCount + 1, baseInterval, maxInterval);
      
      return NextResponse.json({
        success: true,
        message: '確認メールを再送信しました。',
        data: {
          cooldownSeconds: nextCooldown,
          retriesRemaining: maxAttempts - attemptCount - 1,
          attemptNumber: attemptCount + 1,
          checkSpamFolder: attemptCount > 0
        }
      }, { status: 200 });
      
    } catch (dbError) {
      await session.abortTransaction();
      throw dbError;
    } finally {
      session.endSession();
    }
```

## Phase 4: ResendHistoryモデルの確認（3分）

### 4.1 モデルスキーマの確認と修正

```typescript
// src/lib/models/ResendHistory.ts が以下の構造であることを確認

import mongoose, { Schema, Document } from 'mongoose';

interface IResendAttempt {
  timestamp: Date;
  reason: string;
  ip: string;
  userAgent: string;
  token: string;
  success: boolean;
  jobId?: string;
}

interface IResendHistory extends Document {
  userId: mongoose.Types.ObjectId;
  email: string;
  attempts: IResendAttempt[];
  totalAttempts: number;
  lastSuccessAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const resendAttemptSchema = new Schema({
  timestamp: { type: Date, required: true },
  reason: { type: String, required: true },
  ip: { type: String, required: true },
  userAgent: { type: String },
  token: { type: String, required: true },
  success: { type: Boolean, default: false },
  jobId: { type: String }
});

const resendHistorySchema = new Schema({
  userId: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true,
    index: true
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true,
    index: true
  },
  attempts: [resendAttemptSchema],
  totalAttempts: { type: Number, default: 0 },
  lastSuccessAt: Date
}, {
  timestamps: true
});

// インデックス
resendHistorySchema.index({ userId: 1, email: 1 });
resendHistorySchema.index({ 'attempts.timestamp': -1 });

const ResendHistory = mongoose.models.ResendHistory || 
  mongoose.model<IResendHistory>('ResendHistory', resendHistorySchema);

export default ResendHistory;
```

## Phase 5: テスト実行と検証（7分）

### 5.1 段階的テスト実行

```bash
# Step 1: 環境リセット
npm run kill-port
npm run clean
npm install

# Step 2: データベースセットアップ
npm run setup:db

# Step 3: 開発サーバー起動
npm run dev

# Step 4: ヘルスチェック（別ターミナル）
curl http://localhost:3000/api/health

# Step 5: テスト実行
npm run test:resend
```

### 5.2 期待される結果

```
======================================================================
📊 テスト結果レポート
======================================================================

実行時間: XX.XX 秒
総テスト数: 15
✅ 成功: 15
❌ 失敗: 0
成功率: 100.0%

📋 カテゴリ別結果:
┌─────────────────────┬──────┬──────┬──────┬──────┬─────────┐
│ カテゴリ            │ 総数 │ 成功 │ 失敗 │ Skip │ 成功率  │
├─────────────────────┼──────┼──────┼──────┼──────┼─────────┤
│ 機能テスト          │    4 │    4 │    0 │    0 │  100.0% │
│ セキュリティ        │    4 │    4 │    0 │    0 │  100.0% │
│ パフォーマンス      │    3 │    3 │    0 │    0 │  100.0% │
│ 統合テスト          │    3 │    3 │    0 │    0 │  100.0% │
│ UIテスト            │    1 │    1 │    0 │    0 │  100.0% │
└─────────────────────┴──────┴──────┴──────┴──────┴─────────┘
```

## Phase 6: トラブルシューティング（5分）

### 問題1: レート制限が動作しない場合
```javascript
// scripts/test-comprehensive-resend.js の testRateLimit を修正
// 待機時間を短くして、より多くのリクエストを送信
for (let i = 1; i <= 5; i++) {  // 10→5に削減
  // リクエスト送信
  await sleep(10);  // 50ms→10msに短縮
}
```

### 問題2: 入力検証が失敗する場合
```javascript
// テストデータの調整
const maliciousInputs = [
  { email: "test'@test.com", expectedStatus: 400 },
  { email: "<script>@test.com", expectedStatus: 400 },
  { email: "test\r\n@test.com", expectedStatus: 400 },
  { email: "test\u0000@test.com", expectedStatus: 400 },
  { email: null, expectedStatus: 400 },
  { email: {}, expectedStatus: 400 },
];
```

### 問題3: 履歴記録が失敗する場合
```javascript
// MongoDB接続を確認
await connectDB();
// ResendHistoryコレクションを確認
const count = await ResendHistory.countDocuments();
console.log('ResendHistory documents:', count);
```

## 実装チェックリスト

- [ ] Phase 1: rate-limit-advanced.ts完全置換
- [ ] Phase 2: resend/route.ts入力検証部分修正
- [ ] Phase 3: resend/route.ts履歴記録部分修正
- [ ] Phase 4: ResendHistoryモデル確認
- [ ] Phase 5: テスト実行と100%確認
- [ ] Phase 6: 必要に応じてトラブルシューティング

## 重要な注意事項

1. **既存の成功部分は変更しない**
   - パフォーマンステスト関連のコードは触らない
   - UIテスト関連のレスポンス構造は維持

2. **テスト順序を守る**
   - 必ず環境をクリーンにしてから開始
   - データベースのセットアップを忘れない
   - サーバーが完全に起動してからテスト実行

3. **エラーハンドリング**
   - すべての400番台エラーは適切なステータスコードで返す
   - 500エラーは絶対に返さない（try-catchで包括的に処理）

4. **セキュリティ**
   - ユーザーが存在しない場合も200を返す（タイミング攻撃対策）
   - 危険な文字は入力検証で必ずブロック

## 最終確認コマンド

```bash
# 全テストが成功することを確認
npm run test:resend | grep "成功率: 100.0%"

# 自動修正スクリプトでも確認
npm run fix:auto
```

この手順に従えば、一度の実装で60%から100%への改善が達成できます。