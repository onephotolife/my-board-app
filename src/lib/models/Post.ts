import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IPost extends Document {
  title: string;
  content: string;
  author: string;  // ユーザーIDを文字列として保存
  authorName: string;
  authorEmail?: string;
  status?: 'published' | 'draft' | 'deleted';
  likes: string[];  // いいねしたユーザーIDの配列
  likeCount?: number;  // 仮想プロパティ
  createdAt: Date;
  updatedAt: Date;
  toggleLike(userId: string): boolean;
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
    status: {
      type: String,
      enum: ['published', 'draft', 'deleted'],
      default: 'published',
    },
    likes: [{
      type: String,  // ユーザーIDを文字列として保存
      ref: 'User'
    }],
  },
  {
    timestamps: true,
  }
);

// Index for pagination and sorting
PostSchema.index({ createdAt: -1 });
PostSchema.index({ author: 1 });

// toggleLikeメソッドの追加
PostSchema.methods.toggleLike = function(userId: string): boolean {
  const userIdStr = userId.toString();
  const likeIndex = this.likes.indexOf(userIdStr);
  
  if (likeIndex === -1) {
    // いいねを追加
    this.likes.push(userIdStr);
    return true;
  } else {
    // いいねを削除
    this.likes.splice(likeIndex, 1);
    return false;
  }
};

// 仮想プロパティ: いいね数
PostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

// JSON変換時の設定
PostSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.__v;
    return ret;
  },
});

export default mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);