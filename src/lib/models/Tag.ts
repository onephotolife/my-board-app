import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

export interface ITag extends Document {
  key: string; // 正規化キー（検索用）
  display: string; // 推奨表示名（代表）
  countTotal: number; // 総出現数（投稿単位）
  lastUsedAt: Date; // 最終利用日時
  createdAt: Date;
  updatedAt: Date;
}

const TagSchema = new Schema<ITag>(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    display: {
      type: String,
      required: true,
    },
    countTotal: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    lastUsedAt: {
      type: Date,
      required: true,
      default: () => new Date(),
    },
  },
  {
    timestamps: true,
  }
);

TagSchema.index({ countTotal: -1 });
TagSchema.index({ lastUsedAt: -1 });

const Tag: Model<ITag> = mongoose.models.Tag || mongoose.model<ITag>('Tag', TagSchema);
export default Tag;
