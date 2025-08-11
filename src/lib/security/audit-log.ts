import mongoose, { Schema, Document } from 'mongoose';

export interface IAuditLog extends Document {
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  timestamp: Date;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  details?: Record<string, any>;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    event: {
      type: String,
      required: true,
      index: true,
    },
    userId: {
      type: String,
      index: true,
    },
    email: {
      type: String,
      index: true,
    },
    ip: {
      type: String,
    },
    userAgent: {
      type: String,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
      default: 'LOW',
    },
    details: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

// インデックスの作成
AuditLogSchema.index({ event: 1, timestamp: -1 });
AuditLogSchema.index({ userId: 1, event: 1, timestamp: -1 });

export const AuditLog = mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

/**
 * パスワード再利用試行をログに記録
 */
export async function logPasswordReuseAttempt(
  userId: string,
  email: string,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    await AuditLog.create({
      event: 'PASSWORD_REUSE_ATTEMPT',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'MEDIUM',
      details: {
        action: 'Password reset attempted with reused password',
        blocked: true,
      },
    });
    
    // 1時間以内の試行回数をチェック
    const recentAttempts = await AuditLog.countDocuments({
      userId,
      event: 'PASSWORD_REUSE_ATTEMPT',
      timestamp: { $gte: new Date(Date.now() - 3600000) }, // 1時間以内
    });
    
    if (recentAttempts > 3) {
      // 閾値を超えた場合は警告ログを追加
      await AuditLog.create({
        event: 'SECURITY_ALERT',
        userId,
        email,
        ip,
        userAgent,
        timestamp: new Date(),
        severity: 'HIGH',
        details: {
          reason: 'Multiple password reuse attempts detected',
          attemptCount: recentAttempts,
          timeWindow: '1 hour',
        },
      });
      
      console.warn(`⚠️ Security Alert: Multiple password reuse attempts for user ${email}`);
    }
  } catch (error) {
    console.error('Failed to log password reuse attempt:', error);
  }
}

/**
 * パスワードリセット成功をログに記録
 */
export async function logPasswordResetSuccess(
  userId: string,
  email: string,
  ip: string,
  userAgent: string
): Promise<void> {
  try {
    await AuditLog.create({
      event: 'PASSWORD_RESET_SUCCESS',
      userId,
      email,
      ip,
      userAgent,
      timestamp: new Date(),
      severity: 'LOW',
      details: {
        action: 'Password successfully reset',
      },
    });
  } catch (error) {
    console.error('Failed to log password reset success:', error);
  }
}