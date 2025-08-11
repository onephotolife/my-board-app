import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: string;  // ユーザーIDを文字列として保存
  authorName: string;
  authorEmail?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    content: {
      type: String,
      required: true,
      maxlength: 10000,
    },
    author: {
      type: String,  // ユーザーIDを文字列として保存
      required: true,
    },
    authorName: {
      type: String,
      required: true,
    },
    authorEmail: {
      type: String,
      required: false,
    },
  },
  {
    timestamps: true,
  }
);

// Index for pagination and sorting
PostSchema.index({ createdAt: -1 });
PostSchema.index({ author: 1 });

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);