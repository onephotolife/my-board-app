const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB接続
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';

// Userスキーマ定義（正しい型定義）
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: 'user', enum: ['user', 'admin', 'moderator'] },
  emailVerified: { type: Boolean, default: false },  // Boolean型に修正
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function setupTestUser() {
  try {
    // MongoDBに接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB接続成功');

    // テストユーザーのデータ
    const testUser = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'Test1234!',
      role: 'user',
      emailVerified: true // メール確認済みとして設定（Boolean型）
    };

    // 既存のテストユーザーを削除
    await User.deleteOne({ email: testUser.email });
    console.log('🗑️  既存のテストユーザーを削除');

    // パスワードをハッシュ化
    const hashedPassword = await bcrypt.hash(testUser.password, 10);

    // 新しいテストユーザーを作成
    const newUser = await User.create({
      ...testUser,
      password: hashedPassword
    });

    console.log('✅ テストユーザー作成成功:', {
      id: newUser._id.toString(),
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      emailVerified: newUser.emailVerified
    });

    // テスト用の投稿も作成
    const postSchema = new mongoose.Schema({
      title: { type: String, required: true },
      content: { type: String, required: true },
      author: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
      authorName: { type: String, required: true },
      createdAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now }
    });

    const Post = mongoose.models.Post || mongoose.model('Post', postSchema);

    // 既存のテスト投稿を削除
    await Post.deleteMany({ author: newUser._id });
    console.log('🗑️  既存のテスト投稿を削除');

    // テスト投稿を作成
    const testPosts = [
      {
        title: 'テスト投稿1',
        content: 'これはテストユーザーによる最初の投稿です。権限のテストに使用します。',
        author: newUser._id,
        authorName: newUser.name
      },
      {
        title: 'テスト投稿2',
        content: '2つ目のテスト投稿です。編集と削除のボタンが表示されるはずです。',
        author: newUser._id,
        authorName: newUser.name
      }
    ];

    for (const post of testPosts) {
      await Post.create(post);
      console.log(`✅ テスト投稿作成: ${post.title}`);
    }

    // 他のユーザーの投稿も作成（権限テスト用）
    // 既存の他ユーザーを削除
    await User.deleteOne({ email: 'other@example.com' });
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: hashedPassword,
      role: 'user',
      emailVerified: true
    });

    await Post.create({
      title: '他のユーザーの投稿',
      content: 'これは他のユーザーによる投稿です。テストユーザーには編集・削除ボタンが無効になるはずです。',
      author: otherUser._id,
      authorName: otherUser.name
    });

    console.log('✅ 他のユーザーと投稿も作成完了');
    console.log('\n📝 テストアカウント情報:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test1234!');
    console.log('\n🎯 テスト準備完了！');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setupTestUser();