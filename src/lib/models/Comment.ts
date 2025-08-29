import mongoose, { Schema, Document, Model } from 'mongoose';

// コメントインターフェース
export interface IComment extends Document {
  content: string;
  postId: string;
  author: {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
  };
  parentId?: string; // 返信機能用（将来拡張）
  status: 'active' | 'deleted' | 'hidden' | 'reported';
  likes: string[];
  reportCount: number;
  editHistory: Array<{
    content: string;
    editedAt: Date;
    editedBy: string;
  }>;
  metadata: {
    ipAddress?: string;
    userAgent?: string;
    clientVersion?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
  deletedBy?: string;
  // メソッド
  softDelete(deletedBy: string): Promise<IComment>;
  incrementReports(): Promise<IComment>;
  toggleLike(userId: string): Promise<IComment>;
  addEditHistory(content: string, editedBy: string): Promise<IComment>;
}

// Commentスキーマの定義
const CommentSchema = new Schema<IComment>(
  {
    content: {
      type: String,
      required: [true, 'コメント内容は必須です'],
      maxlength: [500, 'コメントは500文字以内'],
      minlength: [1, 'コメントを入力してください'],
      trim: true,
      validate: {
        validator: function(v: string) {
          // XSS対策: 危険なタグを検出
          const dangerousPatterns = /<script|<iframe|javascript:|on\w+=/gi;
          return !dangerousPatterns.test(v);
        },
        message: '不正な文字が含まれています',
      },
    },
    postId: {
      type: String,
      required: [true, '投稿IDは必須です'],
      index: true,
      validate: {
        validator: function(v: string) {
          return /^[0-9a-fA-F]{24}$/.test(v); // ObjectId形式
        },
        message: '無効な投稿IDです',
      },
    },
    author: {
      _id: { 
        type: String, 
        required: [true, '投稿者IDは必須です'],
        index: true 
      },
      name: { 
        type: String, 
        required: [true, '投稿者名は必須です'] 
      },
      email: { 
        type: String, 
        required: [true, 'メールアドレスは必須です'] 
      },
      avatar: String,
    },
    parentId: {
      type: String,
      default: null, // 将来の返信機能用
      validate: {
        validator: function(v: string | null) {
          return !v || /^[0-9a-fA-F]{24}$/.test(v); // ObjectId形式またはnull
        },
        message: '無効なコメントIDです',
      },
    },
    status: {
      type: String,
      enum: ['active', 'deleted', 'hidden', 'reported'],
      default: 'active',
      index: true,
    },
    likes: {
      type: [String],
      default: [],
      validate: {
        validator: function(likes: string[]) {
          return likes.length <= 100; // いいね上限
        },
        message: 'いいねの上限に達しました',
      },
    },
    reportCount: {
      type: Number,
      default: 0,
      max: [10, '通報上限に達しました'],
    },
    editHistory: [{
      content: String,
      editedAt: Date,
      editedBy: String,
    }],
    metadata: {
      ipAddress: String,
      userAgent: String,
      clientVersion: String,
    },
    deletedAt: Date,
    deletedBy: String,
  },
  {
    timestamps: true,
    optimisticConcurrency: true, // 楽観的ロック
  }
);

// 複合インデックス（パフォーマンス最適化）
CommentSchema.index({ postId: 1, createdAt: -1 });
CommentSchema.index({ postId: 1, status: 1, createdAt: -1 });
CommentSchema.index({ 'author._id': 1, status: 1 });
CommentSchema.index({ status: 1, reportCount: 1 }); // モデレーション用
CommentSchema.index({ parentId: 1 }); // 返信機能用（将来）

// 静的メソッド
CommentSchema.statics.findByPost = function(postId: string, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  return this.find({ 
    postId, 
    status: 'active' 
  })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit);
};

CommentSchema.statics.findByAuthor = function(authorId: string, includeDeleted = false) {
  const query = includeDeleted 
    ? { 'author._id': authorId }
    : { 'author._id': authorId, status: 'active' };
  return this.find(query).sort({ createdAt: -1 });
};

CommentSchema.statics.countByPost = function(postId: string, status = 'active') {
  return this.countDocuments({ postId, status });
};

CommentSchema.statics.findReported = function(threshold = 3) {
  return this.find({ 
    reportCount: { $gte: threshold },
    status: { $ne: 'deleted' }
  }).sort({ reportCount: -1, createdAt: -1 });
};

// インスタンスメソッド
CommentSchema.methods.softDelete = function(deletedBy: string) {
  this.status = 'deleted';
  this.deletedAt = new Date();
  this.deletedBy = deletedBy;
  return this.save();
};

CommentSchema.methods.incrementReports = function() {
  this.reportCount += 1;
  if (this.reportCount >= 5) {
    this.status = 'reported';
  }
  return this.save();
};

CommentSchema.methods.toggleLike = function(userId: string) {
  const index = this.likes.indexOf(userId);
  if (index > -1) {
    this.likes.splice(index, 1);
  } else {
    this.likes.push(userId);
  }
  return this.save();
};

CommentSchema.methods.addEditHistory = function(content: string, editedBy: string) {
  this.editHistory.push({
    content: this.content,
    editedAt: new Date(),
    editedBy: editedBy,
  });
  this.content = content;
  return this.save();
};

// 仮想プロパティ
CommentSchema.virtual('likeCount').get(function() {
  return this.likes ? this.likes.length : 0;
});

CommentSchema.virtual('isLikedBy').get(function() {
  return (userId: string) => this.likes.includes(userId);
});

CommentSchema.virtual('canEdit').get(function() {
  return (userId: string) => this.author._id === userId && this.status === 'active';
});

CommentSchema.virtual('canDelete').get(function() {
  return (userId: string) => this.author._id === userId;
});

CommentSchema.virtual('isReported').get(function() {
  return this.reportCount >= 5 || this.status === 'reported';
});

// JSON変換時の設定
CommentSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    
    // 削除済みコメントの内容を隠す
    if (ret.status === 'deleted') {
      ret.content = '[削除されたコメント]';
      delete ret.editHistory;
      delete ret.metadata;
    }
    
    // 通報済みコメントの制限
    if (ret.status === 'reported' || ret.reportCount >= 5) {
      ret.content = '[通報により非表示]';
    }
    
    // セキュリティ情報の除外
    delete ret.metadata?.ipAddress;
    
    return ret;
  },
});

// 保存前のフック（バリデーション強化）
CommentSchema.pre('save', function(next) {
  // 内容の前後空白トリミング
  if (this.isModified('content')) {
    this.content = this.content.trim();
  }
  
  // 通報カウント自動チェック
  if (this.reportCount >= 5 && this.status === 'active') {
    this.status = 'reported';
  }
  
  next();
});

// モデルのエクスポート
const Comment: Model<IComment> = mongoose.models.Comment || mongoose.model<IComment>('Comment', CommentSchema);

export default Comment;