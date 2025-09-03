import type { Document, Types } from 'mongoose';
import mongoose, { Schema } from 'mongoose';

/**
 * フォロー関係を管理するドキュメントのインターフェース
 * 
 * 設計方針：
 * - 重複防止: follower + following の複合ユニークインデックス
 * - 相互フォロー判定: isReciprocal フラグで高速判定
 * - パフォーマンス: 適切なインデックス配置
 * - スケーラビリティ: 別コレクション管理で大量フォロー対応
 */
export interface IFollow extends Document {
  follower: Types.ObjectId;        // フォローする人
  following: Types.ObjectId;       // フォローされる人
  isReciprocal: boolean;          // 相互フォロー状態
  createdAt: Date;
  updatedAt: Date;
}

const FollowSchema = new Schema<IFollow>(
  {
    follower: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,  // フォロー中リストのクエリ最適化
    },
    following: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,  // フォロワーリストのクエリ最適化
    },
    isReciprocal: {
      type: Boolean,
      default: false,
      index: true,  // 相互フォロー抽出のクエリ最適化
    },
  },
  {
    timestamps: true,
    collection: 'follows',
  }
);

// 複合インデックス（重複フォロー防止 + クエリ最適化）
FollowSchema.index({ follower: 1, following: 1 }, { unique: true });

// 相互フォローチェック用インデックス
FollowSchema.index({ following: 1, follower: 1 });

// タイムライン機能用インデックス（フォロー順でソート可能）
FollowSchema.index({ follower: 1, createdAt: -1 });
FollowSchema.index({ following: 1, createdAt: -1 });

// 相互フォロー状態を自動更新するミドルウェア
FollowSchema.pre('save', async function(next) {
  if (this.isNew) {
    // 逆方向の関係をチェック
    const reverseFollow = await mongoose.model<IFollow>('Follow').findOne({
      follower: this.following,
      following: this.follower,
    });
    
    if (reverseFollow) {
      // 相互フォローになった
      this.isReciprocal = true;
      reverseFollow.isReciprocal = true;
      await reverseFollow.save();
    }
  }
  next();
});

// フォロー解除時の相互フォロー状態更新
FollowSchema.post('findOneAndDelete', async function(doc: IFollow) {
  if (doc && doc.isReciprocal) {
    // 逆方向の関係を更新
    await mongoose.model<IFollow>('Follow').findOneAndUpdate(
      {
        follower: doc.following,
        following: doc.follower,
      },
      {
        isReciprocal: false,
      }
    );
  }
});

// 統計メソッド
FollowSchema.statics = {
  /**
   * ユーザーのフォロー数を取得
   */
  async getFollowingCount(userId: Types.ObjectId): Promise<number> {
    return this.countDocuments({ follower: userId });
  },
  
  /**
   * ユーザーのフォロワー数を取得
   */
  async getFollowersCount(userId: Types.ObjectId): Promise<number> {
    return this.countDocuments({ following: userId });
  },
  
  /**
   * 相互フォロー数を取得
   */
  async getMutualFollowsCount(userId: Types.ObjectId): Promise<number> {
    return this.countDocuments({
      $or: [
        { follower: userId, isReciprocal: true },
        { following: userId, isReciprocal: true },
      ],
    });
  },
  
  /**
   * フォロー関係の存在チェック
   */
  async isFollowing(followerId: Types.ObjectId, followingId: Types.ObjectId): Promise<boolean> {
    const count = await this.countDocuments({
      follower: followerId,
      following: followingId,
    });
    return count > 0;
  },
  
  /**
   * ページネーション付きフォロワーリスト取得
   */
  async getFollowers(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 20,
    includeReciprocal: boolean = true
  ) {
    const query: any = { following: userId };
    if (!includeReciprocal) {
      query.isReciprocal = false;
    }
    
    return this.find(query)
      .populate('follower', 'name email avatar bio')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },
  
  /**
   * ページネーション付きフォロー中リスト取得
   */
  async getFollowing(
    userId: Types.ObjectId,
    page: number = 1,
    limit: number = 20,
    includeReciprocal: boolean = true
  ) {
    const query: any = { follower: userId };
    if (!includeReciprocal) {
      query.isReciprocal = false;
    }
    
    return this.find(query)
      .populate('following', 'name email avatar bio')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },
};

// 開発環境でスキーマキャッシュをクリア
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.Follow;
  delete mongoose.connection.models.Follow;
}

export default mongoose.models.Follow || mongoose.model<IFollow>('Follow', FollowSchema);