/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import type { Document } from 'mongoose';
import mongoose, { Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

import { normalizeJa, toYomi, buildPrefixes, buildNgrams } from '@/lib/search/ja-normalize';

export interface IUserSearch {
  nameNormalized?: string;
  nameYomi?: string;
  namePrefixes?: string[];
  nameYomiPrefixes?: string[];
  bioNormalized?: string;
  bioNgrams?: string[];
}

export interface IUserStats {
  followerCount?: number;
  postCount?: number;
  lastActiveAt?: Date | null;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  nameYomi?: string; // ふりがな（ひらがな想定、手入力/辞書で補完）
  searchNameNormalized?: string;
  searchNameYomi?: string;
  search?: IUserSearch;
  stats?: IUserStats;
  role: 'admin' | 'moderator' | 'user';
  emailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationTokenExpiry?: Date;
  emailSendFailed?: boolean;
  passwordResetToken?: string;
  passwordResetExpires?: Date;
  passwordHistory?: Array<{
    hash: string;
    changedAt: Date;
  }>;
  lastPasswordChange?: Date;
  passwordResetCount?: number;
  // プロフィール関連フィールド（新規追加）
  bio?: string; // 自己紹介（最大200文字）
  avatar?: string; // アバター画像URL
  location?: string; // 居住地
  occupation?: string; // 職業
  education?: string; // 学歴
  website?: string; // ウェブサイト
  lastProfileUpdate?: Date;
  // フォロー関連フィールド（新規追加）
  followingCount: number; // フォロー中の数（キャッシュ用）
  followersCount: number; // フォロワー数（キャッシュ用）
  mutualFollowsCount: number; // 相互フォロー数（キャッシュ用）
  isPrivate?: boolean; // プライベートアカウント設定
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
  // フォロー関連メソッド（新規追加）
  follow(targetUserId: string): Promise<void>;
  unfollow(targetUserId: string): Promise<void>;
  isFollowing(targetUserId: string): Promise<boolean>;
  getFollowers(page?: number, limit?: number): Promise<any[]>;
  getFollowing(page?: number, limit?: number): Promise<any[]>;
  updateFollowCounts(): Promise<void>;
}

const SearchSchema = new Schema<IUserSearch>(
  {
    nameNormalized: { type: String, index: true },
    nameYomi: { type: String, index: true },
    namePrefixes: { type: [String], index: true },
    nameYomiPrefixes: { type: [String], index: true },
    bioNormalized: { type: String },
    bioNgrams: { type: [String], index: true },
  },
  { _id: false }
);

const StatsSchema = new Schema<IUserStats>(
  {
    followerCount: { type: Number, default: 0, index: -1 },
    postCount: { type: Number, default: 0 },
    lastActiveAt: { type: Date, default: null, index: -1 },
  },
  { _id: false }
);

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    nameYomi: {
      type: String,
      default: '',
      index: true,
    },
    // Legacy search fields (Step02 で段階移行予定)
    searchNameNormalized: { type: String, index: true },
    searchNameYomi: { type: String, index: true },
    search: {
      type: SearchSchema,
      default: {},
    },
    stats: {
      type: StatsSchema,
      default: {},
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'user'],
      default: 'user',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
    },
    emailVerificationTokenExpiry: {
      type: Date,
    },
    emailSendFailed: {
      type: Boolean,
      default: false,
    },
    passwordResetToken: {
      type: String,
    },
    passwordResetExpires: {
      type: Date,
    },
    passwordHistory: [
      {
        hash: {
          type: String,
          required: true,
        },
        changedAt: {
          type: Date,
          required: true,
        },
      },
    ],
    lastPasswordChange: {
      type: Date,
      default: Date.now,
    },
    passwordResetCount: {
      type: Number,
      default: 0,
    },
    // プロフィール関連フィールド（新規追加）
    bio: {
      type: String,
      maxlength: [200, '自己紹介は200文字以内で入力してください'],
      default: '',
      trim: true,
    },
    avatar: {
      type: String,
      default: '',
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: '有効なURLを入力してください',
      },
    },
    location: {
      type: String,
      maxlength: [100, '場所は100文字以内で入力してください'],
      trim: true,
    },
    occupation: {
      type: String,
      maxlength: [100, '職業は100文字以内で入力してください'],
      trim: true,
    },
    education: {
      type: String,
      maxlength: [100, '学歴は100文字以内で入力してください'],
      trim: true,
    },
    website: {
      type: String,
      validate: {
        validator: function (v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: '有効なURLを入力してください',
      },
    },
    lastProfileUpdate: {
      type: Date,
      default: Date.now,
    },
    // フォロー関連フィールド（新規追加）
    followingCount: {
      type: Number,
      default: 0,
      min: [0, 'フォロー数は0以上である必要があります'],
    },
    followersCount: {
      type: Number,
      default: 0,
      min: [0, 'フォロワー数は0以上である必要があります'],
    },
    mutualFollowsCount: {
      type: Number,
      default: 0,
      min: [0, '相互フォロー数は0以上である必要があります'],
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// テキストインデックス（簡易関連度）
UserSchema.index({ name: 'text', bio: 'text' }, { weights: { name: 5, bio: 2 } });
try {
  (UserSchema as any).index({ 'search.namePrefixes': 1 });
  (UserSchema as any).index({ 'search.nameYomiPrefixes': 1 });
  (UserSchema as any).index({ 'search.bioNgrams': 1 });
  (UserSchema as any).index({ 'stats.followerCount': -1, updatedAt: -1 });
} catch {}

// Hash password before saving & 検索用フィールド更新
UserSchema.pre('save', async function (next) {
  try {
    if (this.isModified('password')) {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
    }

    computeSearchFields(this);

    if ((this.isModified('name') || !this.nameYomi) && this.name) {
      this.nameYomi = toYomi(this.name);
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

function computeSearchFields(doc: any) {
  const name: string = doc.name || '';
  const bio: string = doc.bio || '';

  const nameNormalized = normalizeJa(name);
  const nameYomi = toYomi(name);
  const bioNormalized = normalizeJa(bio);

  doc.search = {
    ...(doc.search || {}),
    nameNormalized,
    nameYomi,
    namePrefixes: buildPrefixes(nameNormalized, 10),
    nameYomiPrefixes: buildPrefixes(nameYomi, 20),
    bioNormalized,
    bioNgrams: buildNgrams(bioNormalized),
  };

  // レガシー補完（当面の共存）
  if (!doc.searchNameNormalized && nameNormalized) doc.searchNameNormalized = nameNormalized;
  if (!doc.searchNameYomi && nameYomi) doc.searchNameYomi = nameYomi;
}

UserSchema.pre('findOneAndUpdate', async function (next) {
  try {
    const update: any = this.getUpdate() || {};
    const $set = update.$set || update;
    const hasName = Object.prototype.hasOwnProperty.call($set, 'name');
    const hasBio = Object.prototype.hasOwnProperty.call($set, 'bio');

    if (!hasName && !hasBio) {
      return next();
    }

    let current: any = null;
    if (!hasName || !hasBio) {
      current = await (this.model as mongoose.Model<IUser>).findOne(this.getQuery()).lean();
      if (!current) {
        return next();
      }
    }

    const nameValue = hasName ? $set.name : current?.name;
    const bioValue = hasBio ? $set.bio : current?.bio;

    const tmp: any = {
      name: typeof nameValue === 'string' ? nameValue : '',
      bio: typeof bioValue === 'string' ? bioValue : '',
      search: $set.search || {},
      searchNameNormalized: $set.searchNameNormalized,
      searchNameYomi: $set.searchNameYomi,
    };

    computeSearchFields(tmp);

    update.$set = {
      ...(update.$set || {}),
      search: tmp.search,
    };

    if (tmp.searchNameNormalized && !$set.searchNameNormalized) {
      update.$set.searchNameNormalized = tmp.searchNameNormalized;
    }
    if (tmp.searchNameYomi && !$set.searchNameYomi) {
      update.$set.searchNameYomi = tmp.searchNameYomi;
    }
    if (hasName && $set.nameYomi === undefined) {
      update.$set.nameYomi = toYomi(tmp.name);
    }

    this.setUpdate(update);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// フォロー関連メソッドの実装
UserSchema.methods.follow = async function (targetUserId: string): Promise<void> {
  // TEMP-FIX: 開発環境ではトランザクションを使用しない（レプリカセット未使用）
  const useTransaction =
    process.env.NODE_ENV === 'production' && process.env.USE_TRANSACTIONS === 'true';

  if (useTransaction) {
    // 本番環境（レプリカセット使用時）
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await this._followInternal(targetUserId, session);
      });
    } catch (error: any) {
      console.error(`Follow failed: userId=${this._id}, targetId=${targetUserId}`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  } else {
    // 開発環境（トランザクションなし）
    try {
      await this._followInternal(targetUserId, null);
    } catch (error: any) {
      console.error(`Follow failed: userId=${this._id}, targetId=${targetUserId}`, error);
      throw error;
    }
  }
};

// 内部フォロー処理（共通ロジック）
UserSchema.methods._followInternal = async function (
  targetUserId: string,
  session: any
): Promise<void> {
  const Follow = mongoose.model('Follow');

  // ObjectId変換とバリデーション
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new Error('無効なユーザーIDです');
  }
  const targetId = new mongoose.Types.ObjectId(targetUserId);

  // 自分自身はフォローできない
  if (this._id.equals(targetId)) {
    throw new Error('自分自身をフォローすることはできません');
  }

  // ターゲットユーザーの存在確認
  const findOptions = session ? { session } : {};
  const targetUser = await mongoose.model('User').findById(targetId, null, findOptions);
  if (!targetUser) {
    throw new Error('フォロー対象のユーザーが存在しません');
  }

  // 既存のフォロー関係をチェック（重複防止）
  const existingFollow = await Follow.findOne(
    {
      follower: this._id,
      following: targetId,
    },
    null,
    findOptions
  );

  if (existingFollow) {
    throw new Error('既にフォローしています');
  }

  // フォロー関係を作成
  const createOptions = session ? { session } : {};
  await Follow.create(
    [
      {
        follower: this._id,
        following: targetId,
      },
    ],
    createOptions
  );

  // 両者のカウントを並列更新
  await Promise.all([this.updateFollowCounts(), targetUser.updateFollowCounts()]);
};

UserSchema.methods.unfollow = async function (targetUserId: string): Promise<void> {
  // TEMP-FIX: 開発環境ではトランザクションを使用しない（レプリカセット未使用）
  const useTransaction =
    process.env.NODE_ENV === 'production' && process.env.USE_TRANSACTIONS === 'true';

  if (useTransaction) {
    // 本番環境（レプリカセット使用時）
    const session = await mongoose.startSession();

    try {
      await session.withTransaction(async () => {
        await this._unfollowInternal(targetUserId, session);
      });
    } catch (error: any) {
      console.error(`Unfollow failed: userId=${this._id}, targetId=${targetUserId}`, error);
      throw error;
    } finally {
      await session.endSession();
    }
  } else {
    // 開発環境（トランザクションなし）
    try {
      await this._unfollowInternal(targetUserId, null);
    } catch (error: any) {
      console.error(`Unfollow failed: userId=${this._id}, targetId=${targetUserId}`, error);
      throw error;
    }
  }
};

// 内部アンフォロー処理（共通ロジック）
UserSchema.methods._unfollowInternal = async function (
  targetUserId: string,
  session: any
): Promise<void> {
  const Follow = mongoose.model('Follow');

  // ObjectId変換とバリデーション
  if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
    throw new Error('無効なユーザーIDです');
  }
  const targetId = new mongoose.Types.ObjectId(targetUserId);

  // フォロー関係を削除
  const deleteOptions = session ? { session } : {};
  const result = await Follow.findOneAndDelete(
    {
      follower: this._id,
      following: targetId,
    },
    deleteOptions
  );

  if (!result) {
    throw new Error('フォローしていません');
  }

  // ターゲットユーザーの取得
  const findOptions = session ? { session } : {};
  const targetUser = await mongoose.model('User').findById(targetId, null, findOptions);
  if (!targetUser) {
    // ユーザーが削除されている場合でもアンフォローは成功扱い
    console.warn(`Target user ${targetId} not found during unfollow`);
  }

  // 両者のカウントを並列更新
  const updatePromises = [this.updateFollowCounts()];
  if (targetUser) {
    updatePromises.push(targetUser.updateFollowCounts());
  }
  await Promise.all(updatePromises);
};

UserSchema.methods.isFollowing = async function (targetUserId: string): Promise<boolean> {
  try {
    // ObjectId変換とバリデーション
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return false; // 無効なIDの場合はfalseを返す
    }

    const Follow = mongoose.model('Follow');
    const targetId = new mongoose.Types.ObjectId(targetUserId);

    // 自分自身の場合は常にfalse
    if (this._id.equals(targetId)) {
      return false;
    }

    const count = await Follow.countDocuments({
      follower: this._id,
      following: targetId,
    });

    return count > 0;
  } catch (error) {
    console.error(`isFollowing check failed: userId=${this._id}, targetId=${targetUserId}`, error);
    return false;
  }
};

UserSchema.methods.getFollowers = async function (
  page: number = 1,
  limit: number = 20
): Promise<any[]> {
  const Follow = mongoose.model('Follow');

  return Follow.find({ following: this._id })
    .populate('follower', 'name email avatar bio followingCount followersCount')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

UserSchema.methods.getFollowing = async function (
  page: number = 1,
  limit: number = 20
): Promise<any[]> {
  const Follow = mongoose.model('Follow');

  return Follow.find({ follower: this._id })
    .populate('following', 'name email avatar bio followingCount followersCount')
    .sort({ createdAt: -1 })
    .skip((page - 1) * limit)
    .limit(limit)
    .lean();
};

UserSchema.methods.updateFollowCounts = async function (): Promise<void> {
  const Follow = mongoose.model('Follow');

  try {
    // 並列でカウント取得（パフォーマンス最適化）
    const [followingCount, followersCount, mutualFollows] = await Promise.all([
      // フォロー数
      Follow.countDocuments({ follower: this._id }),
      // フォロワー数
      Follow.countDocuments({ following: this._id }),
      // 相互フォロー数（自分がフォローしている相手のみカウントで重複防止）
      Follow.countDocuments({
        follower: this._id,
        isReciprocal: true,
      }),
    ]);

    // 更新を保存（validateBeforeSave: falseで無限ループ防止）
    this.followingCount = followingCount;
    this.followersCount = followersCount;
    this.mutualFollowsCount = mutualFollows;

    await this.save({ validateBeforeSave: false });
  } catch (error) {
    console.error(`Failed to update follow counts for user ${this._id}:`, error);
    throw new Error('フォローカウントの更新に失敗しました');
  }
};

// 開発環境でスキーマキャッシュをクリア
if (process.env.NODE_ENV === 'development') {
  delete (mongoose.models as Record<string, unknown>).User;
  const conn = mongoose.connection as unknown as { models?: Record<string, unknown> };
  if (conn.models) {
    delete conn.models.User;
  }
}

// Followモデルを確実にロードする（循環依存を避けるため動的require）
if (!mongoose.models.Follow) {
  try {
    require('./Follow');
  } catch (error) {
    console.warn('Follow model could not be loaded:', error);
  }
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);
