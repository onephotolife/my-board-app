import mongoose, { Schema, Document, Types } from 'mongoose';

/**
 * 統一されたPost Interfaceと Schema定義
 * このファイルが唯一の正式なPostモデル定義となります
 */

// Post Interface
export interface IPost extends Document {
  title: string;
  content: string;
  author: Types.ObjectId;
  authorInfo: {
    name: string;
    email: string;
    avatar?: string | null;
  };
  status: 'published' | 'draft' | 'deleted';
  tags?: string[];
  likes: Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

// Post Schema
const PostSchema = new Schema<IPost>(
  {
    title: {
      type: String,
      required: [true, 'タイトルは必須です'],
      trim: true,
      maxlength: [100, 'タイトルは100文字以内にしてください'],
      minlength: [1, 'タイトルを入力してください']
    },
    content: {
      type: String,
      required: [true, '本文は必須です'],
      maxlength: [1000, '本文は1000文字以内にしてください'],
      minlength: [1, '本文を入力してください']
    },
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, '投稿者情報は必須です'],
      index: true
    },
    authorInfo: {
      name: {
        type: String,
        required: [true, '投稿者名は必須です'],
        trim: true
      },
      email: {
        type: String,
        required: [true, 'メールアドレスは必須です'],
        trim: true,
        lowercase: true
      },
      avatar: {
        type: String,
        default: null
      }
    },
    status: {
      type: String,
      enum: {
        values: ['published', 'draft', 'deleted'],
        message: 'ステータスは published, draft, deleted のいずれかです'
      },
      default: 'published',
      required: true,
      index: true
    },
    tags: [{
      type: String,
      trim: true,
      maxlength: [30, 'タグは30文字以内にしてください']
    }],
    likes: [{
      type: Schema.Types.ObjectId,
      ref: 'User',
      default: []
    }]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        ret.id = ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// インデックス定義（パフォーマンス最適化）
PostSchema.index({ author: 1, createdAt: -1 });
PostSchema.index({ status: 1, createdAt: -1 });
PostSchema.index({ tags: 1 });
PostSchema.index({ 'authorInfo.email': 1 });

// 仮想プロパティ: いいね数
PostSchema.virtual('likeCount').get(function() {
  return this.likes?.length || 0;
});

// 静的メソッド: 公開投稿のみ取得
PostSchema.statics.findPublished = function(filter = {}) {
  return this.find({ ...filter, status: 'published' });
};

// 静的メソッド: ページネーション付き取得
PostSchema.statics.paginate = async function(options: {
  page?: number;
  limit?: number;
  sort?: string;
  filter?: any;
}) {
  const page = options.page || 1;
  const limit = options.limit || 10;
  const sort = options.sort || '-createdAt';
  const filter = { ...options.filter, status: 'published' };

  const skip = (page - 1) * limit;

  const [posts, total] = await Promise.all([
    this.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    this.countDocuments(filter)
  ]);

  return {
    posts,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page < Math.ceil(total / limit),
      hasPrev: page > 1
    }
  };
};

// インスタンスメソッド: 投稿の所有者確認
PostSchema.methods.isOwner = function(userId: string | Types.ObjectId): boolean {
  return this.author.toString() === userId.toString();
};

// インスタンスメソッド: いいねの切り替え
PostSchema.methods.toggleLike = function(userId: Types.ObjectId): void {
  const index = this.likes.findIndex((id: Types.ObjectId) => 
    id.toString() === userId.toString()
  );
  
  if (index === -1) {
    this.likes.push(userId);
  } else {
    this.likes.splice(index, 1);
  }
};

// インスタンスメソッド: ソフトデリート
PostSchema.methods.softDelete = function(): Promise<IPost> {
  this.status = 'deleted';
  return this.save();
};

// Pre-save ミドルウェア: データ検証
PostSchema.pre('save', function(next) {
  // タグの重複削除
  if (this.tags && this.tags.length > 0) {
    this.tags = [...new Set(this.tags)];
  }
  
  // タグ数の制限（最大5個）
  if (this.tags && this.tags.length > 5) {
    return next(new Error('タグは最大5個までです'));
  }
  
  next();
});

// Pre-save ミドルウェア: authorInfoの自動更新
PostSchema.pre('save', async function(next) {
  if (this.isModified('author') && !this.isNew) {
    try {
      const User = mongoose.model('User');
      const user = await User.findById(this.author);
      if (user) {
        this.authorInfo = {
          name: user.name,
          email: user.email,
          avatar: user.avatar || null
        };
      }
    } catch (error) {
      // ユーザーが見つからない場合は既存のauthorInfoを維持
    }
  }
  next();
});

// モデルのエクスポート
const Post = mongoose.models.Post || mongoose.model<IPost>('Post', PostSchema);

export default Post;