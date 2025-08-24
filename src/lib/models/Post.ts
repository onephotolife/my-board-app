import mongoose, { Schema, Document, Model } from 'mongoose';

// 投稿インターフェース
export interface IPost extends Document {
  title: string;
  content: string;
  author: {
    _id: string;
    name: string;
    email: string;
  };
  status: 'published' | 'draft' | 'deleted';
  views: number;
  tags: string[];
  category: 'general' | 'tech' | 'question' | 'discussion' | 'announcement';
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // メソッド
  softDelete(): Promise<IPost>;
  incrementViews(): Promise<IPost>;
}

// Postスキーマの定義
const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, 'タイトルは必須です'],
      minlength: [1, 'タイトルを入力してください'],
      maxlength: [100, 'タイトルは100文字以内で入力してください'],
      trim: true,
    },
    content: {
      type: String,
      required: [true, '本文は必須です'],
      minlength: [1, '本文を入力してください'],
      maxlength: [1000, '本文は1000文字以内で入力してください'],
    },
    author: {
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
    status: {
      type: String,
      enum: ['published', 'draft', 'deleted'],
      default: 'published',
    },
    views: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: function(tags: string[]) {
          return tags.length <= 5;
        },
        message: 'タグは最大5個までです',
      },
    },
    category: {
      type: String,
      enum: ['general', 'tech', 'question', 'discussion', 'announcement'],
      default: 'general',
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// インデックスの設定（パフォーマンス最適化）
PostSchema.index({ createdAt: -1 });
PostSchema.index({ 'author._id': 1 });
PostSchema.index({ status: 1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ category: 1 });
PostSchema.index({ 'author._id': 1, createdAt: -1 }); // 複合インデックス

// 静的メソッド
PostSchema.statics.findPublished = function(page = 1, limit = 10) {
  const skip = (page - 1) * limit;
  return this.find({ status: 'published' })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

PostSchema.statics.findByAuthor = function(authorId: string, includeDeleted = false) {
  const query = includeDeleted 
    ? { 'author._id': authorId }
    : { 'author._id': authorId, status: { $ne: 'deleted' } };
  return this.find(query).sort({ createdAt: -1 });
};

PostSchema.statics.countPublished = function() {
  return this.countDocuments({ status: 'published' });
};

// インスタンスメソッド
PostSchema.methods.softDelete = function() {
  this.status = 'deleted';
  this.deletedAt = new Date();
  return this.save();
};

PostSchema.methods.incrementViews = function() {
  this.views += 1;
  return this.save();
};

PostSchema.methods.toggleLike = function(userId: string) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

// 仮想プロパティ
PostSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

PostSchema.virtual('isLikedBy').get(function() {
  return (userId: string) => this.likes.includes(userId);
});

// JSON変換時の設定
PostSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    // 削除済みの投稿は内容を隠す
    if (ret.status === 'deleted' && !ret.includeDeleted) {
      ret.title = '[削除済み]';
      ret.content = '[この投稿は削除されました]';
    }
    return ret;
  },
});

// モデルのエクスポート
const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;