import mongoose, { Document, Schema } from 'mongoose';

export interface IRateLimit extends Document {
  key: string;
  attempts: number;
  lastAttempt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const RateLimitSchema = new Schema<IRateLimit>({
  key: {
    type: String,
    required: true,
    index: true,
  },
  attempts: {
    type: Number,
    default: 1,
  },
  lastAttempt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// インデックス
RateLimitSchema.index({ key: 1, createdAt: 1 });
RateLimitSchema.index({ createdAt: 1 }, { expireAfterSeconds: 86400 }); // 24時間後に自動削除

export const RateLimit = mongoose.models.RateLimit || mongoose.model<IRateLimit>('RateLimit', RateLimitSchema);