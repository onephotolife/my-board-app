import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
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
  bio?: string;           // 自己紹介（最大200文字）
  avatar?: string;        // アバター画像URL
  location?: string;      // 居住地
  occupation?: string;    // 職業
  education?: string;     // 学歴
  website?: string;       // ウェブサイト
  lastProfileUpdate?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

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
    passwordHistory: [{
      hash: {
        type: String,
        required: true,
      },
      changedAt: {
        type: Date,
        required: true,
      },
    }],
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
        validator: function(v: string) {
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
        validator: function(v: string) {
          return !v || /^https?:\/\/.+/.test(v);
        },
        message: '有効なURLを入力してください',
      },
    },
    lastProfileUpdate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

// 開発環境でスキーマキャッシュをクリア
if (process.env.NODE_ENV === 'development') {
  delete mongoose.models.User;
  delete mongoose.connection.models.User;
}

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);