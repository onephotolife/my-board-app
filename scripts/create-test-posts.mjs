import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI;
console.log('Creating test posts with hashtags...');

await mongoose.connect(uri);
console.log('Connected to MongoDB');

const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxLength: 100 },
  content: { type: String, required: true, maxLength: 500 },
  author: { type: String, required: true, maxLength: 50 },
  tags: [{ type: String, maxLength: 64 }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);

// Test posts with various hashtag patterns
const testPosts = [
  {
    title: "ハッシュタグテスト1",
    content: "これは#テスト #東京 #JavaScript #React #Next.js でのハッシュタグテストです。",
    author: "testuser"
  },
  {
    title: "英語ハッシュタグテスト", 
    content: "Testing #english #TAGS #CamelCase #snake_case hashtags with #123numbers",
    author: "testuser"
  },
  {
    title: "重複テスト",
    content: "同じタグの重複テスト: #test #TEST #Test #テスト #テスト",
    author: "testuser"
  },
  {
    title: "複雑なハッシュタグ",
    content: "複雑なパターン: #日本語タグ #émoji🎉 #🔥火 #test_123 #Multi-Word",
    author: "testuser"
  },
  {
    title: "通常の投稿",
    content: "ハッシュタグなしの通常の投稿です。これは処理されないはずです。",
    author: "testuser"
  }
];

console.log(`Creating ${testPosts.length} test posts...`);

const result = await Post.insertMany(testPosts);
console.log(`✅ Created ${result.length} test posts with hashtag content`);

// Show created posts
const createdPosts = await Post.find({ author: 'testuser' }).sort({ createdAt: -1 }).limit(5);
console.log('\n=== Created Test Posts ===');
createdPosts.forEach((post, i) => {
  console.log(`${i + 1}. ${post.title}`);
  console.log(`   Content: ${post.content}`);
  console.log('');
});

await mongoose.disconnect();
console.log('Disconnected from MongoDB');