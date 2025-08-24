import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: Types.ObjectId;
  authorInfo: {
    name: string;
    email: string;
    avatar?: string;
  };
  status: 'published' | 'draft' | 'deleted';
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema({
  title: {
    type: String,
    required: [true, 'タイトルは必須です'],
    trim: true,
    maxlength: [100, 'タイトルは100文字以内にしてください'],
  },
  content: {
    type: String,
    required: [true, '本文は必須です'],
    maxlength: [1000, '本文は1000文字以内にしてください'],
  },
  author: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '投稿者情報は必須です'],
  },
  authorInfo: {
    name: {
      type: String,
      required: [true, '投稿者名は必須です'],
    },
    email: {
      type: String,
      required: [true, 'メールアドレスは必須です'],
    },
    avatar: {
      type: String,
      default: null,
    },
  },
  status: {
    type: String,
    enum: ['published', 'draft', 'deleted'],
    default: 'published',
  },
  tags: [{
    type: String,
    trim: true,
  }],
}, {
  timestamps: true,
});

// インデックスの設定
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);