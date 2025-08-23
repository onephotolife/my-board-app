const mongoose = require('mongoose');

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

async function listUsers() {
  try {
    // MongoDBに接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功\n');

    // Userスキーマ定義
    const userSchema = new mongoose.Schema({
      name: { type: String, required: true },
      email: { type: String, required: true, unique: true },
      password: { type: String, required: true },
      role: { type: String, default: 'user', enum: ['user', 'admin', 'moderator'] },
      emailVerified: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);

    // すべてのユーザーを取得
    const users = await User.find({}).select('-password');
    
    console.log(`📝 ユーザー数: ${users.length}\n`);
    
    users.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name}`);
      console.log(`   ID: ${user._id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Email Verified: ${user.emailVerified}`);
      console.log(`   Created: ${user.createdAt}`);
      console.log('');
    });
    
    // test@example.comユーザーを特定
    const testUsers = await User.find({ email: 'test@example.com' });
    if (testUsers.length > 0) {
      console.log('⚠️  test@example.comユーザーが複数存在します:');
      testUsers.forEach(u => {
        console.log(`   - ID: ${u._id}, Name: ${u.name}, Created: ${u.createdAt}`);
      });
    }

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

listUsers();