import mongoose, { Document, Model, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

// ユーザーインターフェース
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  bio?: string;
  avatar?: string;
  emailVerified?: Date;
  passwordChangedAt?: Date;
  profileCompletedAt?: Date;
  loginCount?: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ユーザーメソッドインターフェース
interface IUserMethods {
  comparePassword(candidatePassword: string): Promise<boolean>;
  generateAvatar(): string;
}

// モデルの型定義
type UserModel = Model<IUser, {}, IUserMethods>;

// ユーザースキーマ
const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    email: {
      type: String,
      required: [true, 'メールアドレスは必須です'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, '有効なメールアドレスを入力してください'],
    },
    password: {
      type: String,
      required: [true, 'パスワードは必須です'],
      minlength: [8, 'パスワードは8文字以上である必要があります'],
      select: false, // デフォルトでパスワードを返さない
    },
    name: {
      type: String,
      required: [true, '名前は必須です'],
      trim: true,
      maxlength: [50, '名前は50文字以内で入力してください'],
    },
    bio: {
      type: String,
      maxlength: [200, '自己紹介は200文字以内で入力してください'],
      default: '',
      required: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    emailVerified: {
      type: Date,
      default: null,
    },
    passwordChangedAt: {
      type: Date,
      default: null,
    },
    profileCompletedAt: {
      type: Date,
      default: null,
    },
    loginCount: {
      type: Number,
      default: 0,
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// インデックス
userSchema.index({ email: 1 });
userSchema.index({ createdAt: -1 });

// パスワードハッシュ化のミドルウェア
userSchema.pre('save', async function (next) {
  // パスワードが変更されていない場合はスキップ
  if (!this.isModified('password')) return next();

  // パスワードをハッシュ化
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  
  // パスワード変更日時を記録
  if (!this.isNew) {
    this.passwordChangedAt = new Date();
  }
  
  next();
});

// プロフィール完了チェックのミドルウェア
userSchema.pre('save', function (next) {
  if (this.isModified('bio') && this.bio && this.bio.length > 0) {
    if (!this.profileCompletedAt) {
      this.profileCompletedAt = new Date();
    }
  }
  next();
});

// パスワード比較メソッド
userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  return await bcrypt.compare(candidatePassword, this.password);
};

// アバター生成メソッド（頭文字）
userSchema.methods.generateAvatar = function (): string {
  if (this.avatar) return this.avatar;
  
  const initials = this.name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
    
  return initials;
};

// 仮想プロパティ: プロフィール完了状態
userSchema.virtual('isProfileComplete').get(function () {
  return !!(this.bio && this.bio.length > 0);
});

// JSON変換時の設定
userSchema.set('toJSON', {
  virtuals: true,
  transform: function (doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

// モデルのエクスポート
const User = (mongoose.models.User as UserModel) || 
  mongoose.model<IUser, UserModel>('User', userSchema);

export default User;