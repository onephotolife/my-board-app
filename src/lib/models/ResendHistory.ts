import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

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