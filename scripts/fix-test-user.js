const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

async function fixTestUser() {
  try {
    // MongoDBに接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // Userスキーマ定義（emailVerifiedをBoolean型で定義）
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'user', enum: ['user', 'admin', 'moderator'] },
      emailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    // comparePasswordメソッドを追加
    userSchema.methods.comparePassword = async function(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // 既存のtest@example.comユーザーを削除
    await User.deleteOne({ email: 'test@example.com' });
    console.log('🗑️  既存のテストユーザーを削除');

    // パスワードを正しくハッシュ化
    const testPassword = 'Test1234!';
    const hashedPassword = await bcrypt.hash(testPassword, 10);
    console.log('🔐 パスワードハッシュ生成:', {
      originalPassword: testPassword,
      hashLength: hashedPassword.length,
      hashPrefix: hashedPassword.substring(0, 7)
    });

    // 新しいテストユーザーを作成
    const newUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      emailVerified: true
    });

    console.log('✅ テストユーザー作成成功:', {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      emailVerified: newUser.emailVerified
    });

    // パスワード検証テスト
    console.log('\n🔍 パスワード検証テスト:');
    
    // 直接bcrypt.compareでテスト
    const testResult1 = await bcrypt.compare(testPassword, newUser.password);
    console.log('   bcrypt.compare(正しいパスワード):', testResult1 ? '✅ 成功' : '❌ 失敗');
    
    const testResult2 = await bcrypt.compare('wrongpassword', newUser.password);
    console.log('   bcrypt.compare(間違ったパスワード):', testResult2 ? '❌ 成功（エラー）' : '✅ 失敗（正常）');
    
    // comparePasswordメソッドでテスト
    if (newUser.comparePassword) {
      const testResult3 = await newUser.comparePassword(testPassword);
      console.log('   comparePassword(正しいパスワード):', testResult3 ? '✅ 成功' : '❌ 失敗');
    }

    console.log('\n📝 テストアカウント情報:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test1234!');
    console.log('\n🎯 修正完了！');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

fixTestUser();