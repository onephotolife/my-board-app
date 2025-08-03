import mongoose, { Schema, Document } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: string;
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
    maxlength: [200, '投稿は200文字以内にしてください'],
  },
  author: {
    type: String,
    required: [true, '投稿者名は必須です'],
    maxlength: [50, '投稿者名は50文字以内にしてください'],
  },
}, {
  timestamps: true,
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);