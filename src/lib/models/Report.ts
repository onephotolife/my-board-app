import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface IReport extends Document {
  postId: mongoose.Types.ObjectId;
  reportedBy: {
    _id: string;
    name: string;
    email: string;
  };
  reason: 'spam' | 'inappropriate' | 'harassment' | 'misinformation' | 'other';
  description: string;
  status: 'pending' | 'reviewing' | 'resolved' | 'dismissed';
  moderatorNotes?: string;
  resolvedBy?: {
    _id: string;
    name: string;
    email: string;
  };
  resolvedAt?: Date;
  action?: 'none' | 'warning' | 'delete' | 'ban';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>({
  postId: {
    type: Schema.Types.ObjectId,
    ref: 'Post',
    required: [true, '通報対象の投稿IDが必要です'],
  },
  reportedBy: {
    _id: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
    },
  },
  reason: {
    type: String,
    enum: ['spam', 'inappropriate', 'harassment', 'misinformation', 'other'],
    required: [true, '通報理由を選択してください'],
  },
  description: {
    type: String,
    required: [true, '詳細な説明を入力してください'],
    maxlength: [500, '説明は500文字以内にしてください'],
  },
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending',
  },
  moderatorNotes: {
    type: String,
    maxlength: [1000, 'モデレーターメモは1000文字以内にしてください'],
  },
  resolvedBy: {
    _id: String,
    name: String,
    email: String,
  },
  resolvedAt: Date,
  action: {
    type: String,
    enum: ['none', 'warning', 'delete', 'ban'],
  },
}, {
  timestamps: true,
});

// インデックス
ReportSchema.index({ postId: 1, 'reportedBy._id': 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ 'reportedBy._id': 1 });
ReportSchema.index({ reason: 1 });

// 統計メソッド
ReportSchema.statics.getStatsByReason = async function() {
  return this.aggregate([
    {
      $group: {
        _id: '$reason',
        count: { $sum: 1 },
        pending: {
          $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
        },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

ReportSchema.statics.getPendingCount = async function() {
  return this.countDocuments({ status: 'pending' });
};

ReportSchema.statics.getRecentReports = async function(limit = 10) {
  return this.find({ status: 'pending' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('postId', 'title content author');
};

const Report: Model<IReport> = mongoose.models.Report || mongoose.model<IReport>('Report', ReportSchema);

export default Report;