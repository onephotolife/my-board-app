const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env.local') });

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['admin', 'moderator', 'user'],
    default: 'user'
  },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

const testUsers = [
  {
    email: 'admin@test.local',
    password: 'admin123',
    name: 'Test Admin',
    role: 'admin'
  },
  {
    email: 'moderator@test.local',
    password: 'mod123',
    name: 'Test Moderator',
    role: 'moderator'
  },
  {
    email: 'user1@test.local',
    password: 'user123',
    name: 'Test User 1',
    role: 'user'
  },
  {
    email: 'user2@test.local',
    password: 'user123',
    name: 'Test User 2',
    role: 'user'
  }
];

async function createTestUsers() {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    console.log('MongoDB接続中...');
    await mongoose.connect(mongoUri);
    console.log('✅ MongoDB接続成功');

    console.log('\n🧑‍💻 テストユーザー作成開始\n');

    for (const userData of testUsers) {
      try {
        const hashedPassword = await bcrypt.hash(userData.password, 10);
        
        const user = await User.findOneAndUpdate(
          { email: userData.email },
          {
            ...userData,
            password: hashedPassword,
            updatedAt: new Date()
          },
          { 
            upsert: true, 
            new: true,
            setDefaultsOnInsert: true
          }
        );

        console.log('✅ ' + userData.role.toUpperCase() + ' ユーザー作成/更新:');
        console.log('   Email: ' + userData.email);
        console.log('   Password: ' + userData.password);
        console.log('   Role: ' + userData.role);
        console.log('   ID: ' + user._id);
        console.log('');
      } catch (error) {
        console.error('❌ ' + userData.email + ' の作成エラー:', error.message);
      }
    }

    const stats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } }
    ]);

    console.log('📊 ユーザー統計:');
    stats.forEach(stat => {
      console.log('   ' + stat._id + ': ' + stat.count + '人');
    });

    console.log('\n✅ テストユーザー作成完了');
    
  } catch (error) {
    console.error('❌ エラー:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 MongoDB接続を閉じました');
  }
}

createTestUsers();
