import type { Document, Model } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

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
  likes: string[];
  tags: string[];
  category: 'general' | 'tech' | 'question' | 'discussion' | 'announcement';
  // コメント機能拡張
  commentCount: number;
  lastCommentAt?: Date;
  commentStats: {
    total: number;
    active: number;
    deleted: number;
    reported: number;
  };
  commentsEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  // メソッド
  softDelete(): Promise<IPost>;
  incrementViews(): Promise<IPost>;
  updateCommentCount(): Promise<IPost>;
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
    likes: {
      type: [String],
      default: [],
      validate: {
        validator: function(likes: string[]) {
          return likes.length <= 1000; // 最大1000いいねまで（パフォーマンス考慮）
        },
        message: 'いいねの上限に達しました',
      },
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
    // コメント機能拡張フィールド
    commentCount: {
      type: Number,
      default: 0,
      min: [0, 'コメント数は0以上である必要があります'],
    },
    lastCommentAt: {
      type: Date,
      default: null,
    },
    commentStats: {
      total: { type: Number, default: 0 },
      active: { type: Number, default: 0 },
      deleted: { type: Number, default: 0 },
      reported: { type: Number, default: 0 },
    },
    commentsEnabled: {
      type: Boolean,
      default: true,
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
PostSchema.index({ likes: 1 }); // いいね検索用
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

// コメント統計更新メソッド
PostSchema.methods.updateCommentCount = async function() {
  try {
    const Comment = mongoose.models.Comment;
    if (!Comment) {
      console.warn('[POST] Commentモデルが見つかりません。コメント統計をスキップ');
      return this;
    }

    // ObjectIdを文字列に変換
    const postIdString = this._id.toString();
    
    console.log('[POST-DEBUG] updateCommentCount called for:', {
      postId: postIdString,
      originalType: typeof this._id
    });

    // アクティブコメント数
    const activeCount = await Comment.countDocuments({
      postId: postIdString,
      status: 'active'
    });

    // 統計情報の取得
    const [totalCount, deletedCount, reportedCount] = await Promise.all([
      Comment.countDocuments({ postId: postIdString }),
      Comment.countDocuments({ postId: postIdString, status: 'deleted' }),
      Comment.countDocuments({ postId: postIdString, status: 'reported' })
    ]);

    // 最新コメントの取得
    const lastComment = await Comment.findOne({
      postId: postIdString,
      status: 'active'
    }).sort({ createdAt: -1 });

    // 統計情報の更新
    this.commentCount = activeCount;
    this.commentStats = {
      total: totalCount,
      active: activeCount,
      deleted: deletedCount,
      reported: reportedCount
    };
    this.lastCommentAt = lastComment?.createdAt || null;

    console.log('[POST-DEBUG] Comment stats updated:', {
      postId: this._id,
      commentCount: this.commentCount,
      stats: this.commentStats,
      lastCommentAt: this.lastCommentAt
    });

    return this.save();
  } catch (error) {
    console.error('[POST-ERROR] Failed to update comment count:', error);
    return this;
  }
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