import mongoose from 'mongoose';

// Use local MongoDB connection
const MONGODB_URI = 'mongodb://localhost:27017/board-app';

// Import hashtag utility (duplicate to avoid import issues)
const HASHTAG_REGEX = /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
const VARIATION_SELECTOR_REGEX = /\uFE0E|\uFE0F/gu;

function normalizeTag(raw) {
  if (!raw) return '';
  let s = raw.normalize('NFKC');
  s = s.replace(VARIATION_SELECTOR_REGEX, '');
  s = s.replace(/^#+/, '');
  s = s.trim();
  s = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  if (s.length < 1 || s.length > 64) return '';
  return s;
}

function extractHashtags(text) {
  if (!text) return [];
  const set = new Map();
  for (const match of text.matchAll(HASHTAG_REGEX)) {
    const display = match[1];
    const key = normalizeTag(display);
    if (key) {
      if (!set.has(key)) set.set(key, display);
    }
  }
  return Array.from(set.entries()).map(([key, display]) => ({ key, display }));
}

// MongoDB Models
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxLength: 100 },
  content: { type: String, required: true, maxLength: 500 },
  author: { 
    _id: String,
    name: String,
    email: String
  },
  authorInfo: {
    name: String,
    email: String,
    avatar: String
  },
  tags: [{ type: String, maxLength: 64 }],
  status: { type: String, default: 'published' },
  views: { type: Number, default: 0 }
}, { timestamps: true });

const TagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxLength: 64 },
  display: { type: String, required: true, maxLength: 64 },
  countTotal: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

async function populateLocalDatabase() {
  try {
    console.log('🏠 [LOCAL-DB] Populating local database with hashtag test data...');
    
    // Connect to local MongoDB
    console.log('🔄 Connecting to local MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to local MongoDB');

    // Sample posts with hashtags
    const samplePosts = [
      {
        title: 'ReactとNext.jsの学習',
        content: 'ReactとNext.jsを学習中です。とても楽しいです！ #React #NextJS #JavaScript #プログラミング #学習',
        author: { _id: 'user1', name: 'テストユーザー1', email: 'test1@example.com' },
        authorInfo: { name: 'テストユーザー1', email: 'test1@example.com', avatar: null },
      },
      {
        title: '東京の観光スポット',
        content: '今日は東京の観光スポットを回りました。浅草、上野、渋谷などを回って楽しかったです。 #東京 #観光 #浅草 #上野 #渋谷',
        author: { _id: 'user2', name: 'テストユーザー2', email: 'test2@example.com' },
        authorInfo: { name: 'テストユーザー2', email: 'test2@example.com', avatar: null },
      },
      {
        title: 'テスト投稿',
        content: 'これはテスト投稿です。ハッシュタグのテストをしています。 #テスト #ハッシュタグ #プログラミング #開発',
        author: { _id: 'user3', name: 'テストユーザー3', email: 'test3@example.com' },
        authorInfo: { name: 'テストユーザー3', email: 'test3@example.com', avatar: null },
      },
      {
        title: 'TypeScript学習記録',
        content: 'TypeScriptの学習を始めました。型安全性が素晴らしいです。 #TypeScript #JavaScript #プログラミング #学習 #Web開発',
        author: { _id: 'user4', name: 'テストユーザー4', email: 'test4@example.com' },
        authorInfo: { name: 'テストユーザー4', email: 'test4@example.com', avatar: null },
      },
      {
        title: '日本語ハッシュタグテスト',
        content: 'Unicode絵文字やZWJ対応のテストです。 #日本語 #絵文字 #🚀 #👨‍💻 #🇯🇵 #テスト',
        author: { _id: 'user5', name: 'テストユーザー5', email: 'test5@example.com' },
        authorInfo: { name: 'テストユーザー5', email: 'test5@example.com', avatar: null },
      },
    ];

    // Clear existing data
    console.log('🗑️ Clearing existing posts and tags...');
    await Post.deleteMany({});
    await Tag.deleteMany({});

    // Create posts and extract hashtags
    console.log('📝 Creating sample posts...');
    const allTagsMap = new Map();

    for (const postData of samplePosts) {
      // Extract hashtags
      const extracted = extractHashtags(postData.content);
      const tagKeys = extracted.map(tag => tag.key).slice(0, 5);

      // Create post
      const post = await Post.create({
        ...postData,
        tags: tagKeys,
        status: 'published',
        views: 0
      });

      console.log(`✅ Created post: ${post.title}`);

      // Aggregate tags
      extracted.forEach(({ key, display }) => {
        if (allTagsMap.has(key)) {
          allTagsMap.get(key).count++;
          allTagsMap.get(key).lastUsedAt = new Date();
        } else {
          allTagsMap.set(key, { key, display, count: 1, lastUsedAt: new Date() });
        }
      });
    }

    // Create tag documents
    console.log('🏷️ Creating tag documents...');
    const tagBulkOps = Array.from(allTagsMap.values()).map(({ key, display, count, lastUsedAt }) => ({
      updateOne: {
        filter: { key },
        update: {
          $set: { display, lastUsedAt },
          $inc: { countTotal: count },
        },
        upsert: true,
      },
    }));

    if (tagBulkOps.length > 0) {
      const tagResult = await Tag.bulkWrite(tagBulkOps);
      console.log(`🏷️ Created/updated ${tagResult.upsertedCount + tagResult.modifiedCount} tags`);
    }

    // Verify data
    console.log('\n🔍 Verification:');
    const postCount = await Post.countDocuments();
    const tagCount = await Tag.countDocuments();
    console.log(`📝 Posts: ${postCount}`);
    console.log(`🏷️ Tags: ${tagCount}`);

    // Show sample tags
    const topTags = await Tag.find({}).sort({ countTotal: -1 }).limit(10);
    console.log('\n🔥 Top tags:');
    topTags.forEach(tag => {
      console.log(`  ${tag.display} (${tag.key}): ${tag.countTotal} uses`);
    });

    console.log('\n🎉 [LOCAL-DB] Local database population completed successfully!');

  } catch (error) {
    console.error('❌ [LOCAL-DB] Population failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the population
populateLocalDatabase().catch(console.error);