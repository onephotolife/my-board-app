import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: string; // ユーザーID
  authorName: string; // ユーザー名（表示用）
  authorEmail?: string; // メールアドレス（オプション）
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema({
  title: {
    type: String,
    required: [true, 'タイトルは必須です'],
    maxlength: [100, 'タイトルは100文字以内にしてください'],
  },
  content: {
    type: String,
    required: [true, '投稿内容は必須です'],
    maxlength: [500, '投稿は500文字以内にしてください'],
  },
  author: {
    type: String,
    required: [true, 'ユーザーIDは必須です'],
    ref: 'User',
  },
  authorName: {
    type: String,
    required: [true, '投稿者名は必須です'],
    maxlength: [50, '投稿者名は50文字以内にしてください'],
  },
  authorEmail: {
    type: String,
    required: false,
  },
}, {
  timestamps: true,
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);