const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB Atlas接続（.env.localと同じ）
const MONGODB_URI = 'mongodb+srv://boarduser:thc1234567890THC@cluster0.ej6jq5c.mongodb.net/boardDB?retryWrites=true&w=majority';

async function setupAtlasTestUser() {
  try {
    // MongoDB Atlasに接続
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Atlas接続成功');

    // Userスキーマ定義（実際のアプリケーションと同じ）
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

    // 既存のtest@example.comユーザーを確認
    const existingUser = await User.findOne({ email: 'test@example.com' });
    if (existingUser) {
      console.log('🔍 既存のテストユーザー発見:', {
        id: existingUser._id.toString(),
        email: existingUser.email,
        emailVerified: existingUser.emailVerified
      });
      
      // 既存ユーザーを削除
      await User.deleteOne({ email: 'test@example.com' });
      console.log('🗑️  既存のテストユーザーを削除');
    }

    // パスワードをハッシュ化（cost factor 12を使用）
    const testPassword = 'Test1234!';
    const hashedPassword = await bcrypt.hash(testPassword, 12); // Atlas上の既存データと同じcost factor
    console.log('🔐 パスワードハッシュ生成:', {
      originalPassword: testPassword,
      hashLength: hashedPassword.length,
      hashPrefix: hashedPassword.substring(0, 7),
      costFactor: 12
    });

    // 新しいテストユーザーを作成
    const newUser = await User.create({
      name: 'Test User',
      email: 'test@example.com',
      password: hashedPassword,
      role: 'user',
      emailVerified: true
    });

    console.log('✅ Atlas上にテストユーザー作成成功:', {
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

    // 他のテストユーザーも作成（権限テスト用）
    await User.deleteOne({ email: 'other@example.com' });
    const otherUser = await User.create({
      name: 'Other User',
      email: 'other@example.com',
      password: hashedPassword,
      role: 'user',
      emailVerified: true
    });
    console.log('\n✅ 他のテストユーザーも作成:', otherUser.email);

    // Postスキーマ定義
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
    await Post.deleteMany({ 
      $or: [
        { author: newUser._id },
        { author: otherUser._id }
      ]
    });
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
      },
      {
        title: '他のユーザーの投稿',
        content: 'これは他のユーザーによる投稿です。テストユーザーには編集・削除ボタンが無効になるはずです。',
        author: otherUser._id,
        authorName: otherUser.name
      }
    ];

    for (const post of testPosts) {
      await Post.create(post);
      console.log(`✅ テスト投稿作成: ${post.title}`);
    }

    console.log('\n📝 テストアカウント情報:');
    console.log('   Email: test@example.com');
    console.log('   Password: Test1234!');
    console.log('\n🎯 MongoDB Atlas上のテスト準備完了！');

    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ エラー:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

setupAtlasTestUser();