const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// ユーザースキーマ定義
const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDBに接続しました');
    
    // 既存のテストユーザーを削除
    await User.deleteOne({ email: 'test@example.com' });
    console.log('🗑️ 既存のテストユーザーを削除しました');
    
    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash('TestPassword123!', 12);
    
    // テストユーザーを作成
    const testUser = await User.create({
      email: 'test@example.com',
      password: hashedPassword,
      name: 'テストユーザー',
      emailVerified: true  // テスト用にメール確認済みに設定
    });
    
    console.log('✅ テストユーザーを作成しました:');
    console.log({
      id: testUser._id,
      email: testUser.email,
      name: testUser.name,
      emailVerified: testUser.emailVerified
    });
    
    // 確認のため再取得
    const verifyUser = await User.findOne({ email: 'test@example.com' });
    console.log('🔍 確認: emailVerified =', verifyUser.emailVerified);
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 MongoDBから切断しました');
  }
}

createTestUser();