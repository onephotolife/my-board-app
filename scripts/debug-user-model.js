#!/usr/bin/env node

const mongoose = require('mongoose');
const { MongoClient } = require('mongodb');

async function debugUserModel() {
  const mongoUri = 'mongodb://localhost:27017/board-app';
  
  // MongoDBネイティブドライバで確認
  const client = new MongoClient(mongoUri);
  await client.connect();
  const db = client.db();
  
  console.log('📂 MongoDB コレクション一覧:');
  const collections = await db.listCollections().toArray();
  collections.forEach(c => console.log('  -', c.name));
  
  // usersコレクションの内容を確認
  const usersCollection = db.collection('users');
  const userCount = await usersCollection.countDocuments();
  console.log(`\n👤 usersコレクション: ${userCount}件`);
  
  const testUser = await usersCollection.findOne({ email: 'test1@example.com' });
  if (testUser) {
    console.log('✅ test1@example.com が見つかりました:');
    console.log('  _id:', testUser._id);
    console.log('  email:', testUser.email);
    console.log('  name:', testUser.name);
    console.log('  emailVerified:', testUser.emailVerified);
    console.log('  password exists:', !!testUser.password);
  } else {
    console.log('❌ test1@example.com が見つかりません');
    
    // 最初の5件を表示
    const samples = await usersCollection.find({}).limit(5).toArray();
    console.log('\n📋 サンプルユーザー:');
    samples.forEach(u => {
      console.log(`  - ${u.email} (name: ${u.name})`);
    });
  }
  
  await client.close();
  
  // Mongooseで接続してモデルを作成
  console.log('\n🔬 Mongoose接続テスト...');
  await mongoose.connect(mongoUri);
  
  // スキーマを定義（Userモデルと同じ構造）
  const UserSchema = new mongoose.Schema({
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
    emailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationTokenExpiry: Date,
  }, {
    timestamps: true
  });
  
  // モデルを作成
  const User = mongoose.models.User || mongoose.model('User', UserSchema);
  console.log('📂 Mongooseコレクション名:', User.collection.name);
  
  // Mongooseで検索
  const mongooseUser = await User.findOne({ email: 'test1@example.com' });
  if (mongooseUser) {
    console.log('✅ Mongooseで見つかりました:');
    console.log('  _id:', mongooseUser._id);
    console.log('  email:', mongooseUser.email);
  } else {
    console.log('❌ Mongooseで見つかりません');
    
    // カウントを確認
    const count = await User.countDocuments();
    console.log(`  総ユーザー数: ${count}`);
  }
  
  await mongoose.disconnect();
}

debugUserModel().catch(console.error);