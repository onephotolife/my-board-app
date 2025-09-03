import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IRateLimit extends Document {
  identifier: string; // IP address or email
  action: string; // e.g., 'email-resend', 'login', 'register'
  attempts: number;
  lastAttempt: Date;
  blockedUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>(
  {
    identifier: {
      type: String,
      required: true,
      index: true,
    },
    action: {
      type: String,
      required: true,
      index: true,
    },
    attempts: {
      type: Number,
      default: 0,
    },
    lastAttempt: {
      type: Date,
      default: Date.now,
    },
    blockedUntil: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

// 複合インデックスでパフォーマンスを最適化
RateLimitSchema.index({ identifier: 1, action: 1 });

// TTLインデックスで古いレコードを自動削除（7日後）
RateLimitSchema.index({ updatedAt: 1 }, { expireAfterSeconds: 604800 });

// 開発環境でスキーマキャッシュをクリア
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.RateLimit;
  delete mongoose.connection.models.RateLimit;
}

export default mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);