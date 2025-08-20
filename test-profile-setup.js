// プロフィールテスト用ユーザー作成スクリプト
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB URI
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// Userスキーマ定義（簡易版）
const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  bio: { type: String, default: '' },
  emailVerified: { type: Boolean, default: false },
  passwordChangedAt: { type: Date },
  profileCompletedAt: { type: Date },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function createTestUser() {
  try {
    // MongoDB接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // テストユーザー情報
    const testUserData = {
      email: 'profile.test@example.com',
      password: 'Test1234!',  // パスワードポリシーに準拠
      name: 'テストユーザー',
      bio: 'これはテスト用のプロフィールです。',
      emailVerified: true,  // メール確認済みに設定
    };

    // 既存ユーザーチェック
    const existingUser = await User.findOne({ email: testUserData.email });
    if (existingUser) {
      console.log('⚠️  ユーザーが既に存在します。更新します...');
      
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(testUserData.password, 10);
      
      // 既存ユーザーを更新
      existingUser.password = hashedPassword;
      existingUser.name = testUserData.name;
      existingUser.bio = testUserData.bio;
      existingUser.emailVerified = true;
      await existingUser.save();
      
      console.log('✅ テストユーザー更新完了');
    } else {
      // パスワードをハッシュ化
      const hashedPassword = await bcrypt.hash(testUserData.password, 10);
      
      // 新規ユーザー作成
      const newUser = new User({
        ...testUserData,
        password: hashedPassword,
      });
      
      await newUser.save();
      console.log('✅ テストユーザー作成完了');
    }

    console.log('\n📝 テストユーザー情報:');
    console.log('   Email: profile.test@example.com');
    console.log('   Password: Test1234!');
    console.log('   Name: テストユーザー');
    console.log('   Bio: これはテスト用のプロフィールです。');
    console.log('\n');

  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 MongoDB切断');
    process.exit(0);
  }
}

// 実行
createTestUser();