const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDBに接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/myBoardDB';

// Userスキーマの定義
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  emailVerified: { type: Boolean, default: true },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    console.log('🔌 MongoDBに接続中...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // 必須認証ユーザー情報
    const testEmail = 'one.photolife+1@gmail.com';
    const plainPassword = '?@thc123THC@?';

    // 既存のテストユーザーを確認
    const existingUser = await User.findOne({ email: testEmail });
    if (existingUser) {
      console.log('ℹ️  ユーザーは既に存在します:', testEmail);
      console.log('  ID:', existingUser._id);
      console.log('  emailVerified:', existingUser.emailVerified);
      return;
    }

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(plainPassword, 10);
    
    // ハッシュを検証
    const isHashValid = await bcrypt.compare(plainPassword, hashedPassword);
    console.log('🔐 ハッシュ検証:', isHashValid);
    console.log('🔑 平文パスワード:', plainPassword);
    console.log('🔒 ハッシュ:', hashedPassword);

    // テストユーザーを作成
    const testUser = await User.create({
      email: testEmail,
      password: hashedPassword,
      name: 'Test User One',
      emailVerified: true, // メール確認済みとして作成
      role: 'user'
    });

    console.log('✅ テストユーザーを作成しました:');
    console.log({
      email: testUser.email,
      name: testUser.name,
      emailVerified: testUser.emailVerified,
      id: testUser._id
    });

    // 接続を閉じる
    await mongoose.connection.close();
    console.log('🔌 MongoDB接続を閉じました');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ エラーが発生しました:', error);
    process.exit(1);
  }
}

createTestUser();
