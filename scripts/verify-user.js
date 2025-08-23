const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

async function verifyUser() {
  try {
    // MongoDBに接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // Userスキーマ定義（実際のモデルと同じ）
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

    // テストユーザーを検索
    const user = await User.findOne({ email: 'test@example.com' });
    
    if (!user) {
      console.log('❌ ユーザーが見つかりません');
      await mongoose.connection.close();
      return;
    }

    console.log('\n📝 ユーザー情報:');
    console.log('   ID:', user._id.toString());
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Email Verified:', user.emailVerified);
    console.log('   Password Hash存在:', !!user.password);
    console.log('   Password Hash長さ:', user.password ? user.password.length : 0);
    
    // パスワード検証
    const testPassword = 'Test1234!';
    console.log('\n🔐 パスワード検証:');
    console.log('   テストパスワード:', testPassword);
    
    // comparePasswordメソッドを使用
    if (user.comparePassword) {
      const isValidMethod = await user.comparePassword(testPassword);
      console.log('   comparePasswordメソッド:', isValidMethod ? '✅ 一致' : '❌ 不一致');
    }
    
    // 直接bcryptで検証
    const isValidDirect = await bcrypt.compare(testPassword, user.password);
    console.log('   bcrypt.compare直接:', isValidDirect ? '✅ 一致' : '❌ 不一致');
    
    // パスワードハッシュの最初の文字を確認（bcryptは$2aや$2bで始まる）
    console.log('   ハッシュプレフィックス:', user.password.substring(0, 3));
    
    await mongoose.connection.close();
    console.log('\n✅ 検証完了');
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

verifyUser();