import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

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

async function testHashtagFunctionality() {
  try {
    console.log('🧪 [HASHTAG-TEST] Starting hashtag functionality test...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    console.log('🔄 Connecting to MongoDB:', uri.substring(0, 30) + '...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Test content with various hashtags
    const testContent = 'これはテスト投稿です #東京 #JavaScript #React #テスト #🚀 #日本語ハッシュタグ';
    console.log('📝 Test content:', testContent);

    // Extract hashtags
    const extracted = extractHashtags(testContent);
    console.log('🏷️  Extracted hashtags:', extracted);

    if (extracted.length === 0) {
      console.error('❌ No hashtags extracted from test content');
      return;
    }

    const tagKeys = extracted.map(tag => tag.key);
    console.log('🔑 Tag keys:', tagKeys);

    // Create test post
    const postData = {
      title: 'ハッシュタグテスト投稿',
      content: testContent,
      author: {
        _id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com'
      },
      authorInfo: {
        name: 'Test User', 
        email: 'test@example.com',
        avatar: null
      },
      tags: tagKeys.slice(0, 5), // Max 5 tags
      status: 'published',
      views: 0
    };

    console.log('💾 Creating post with hashtags...');
    const post = await Post.create(postData);
    console.log('✅ Post created:', post._id);

    // Update tag counts
    if (tagKeys.length > 0) {
      const now = new Date();
      const ops = tagKeys.map((key) => {
        const display = extracted.find((t) => t.key === key)?.display || key;
        return {
          updateOne: {
            filter: { key },
            update: {
              $setOnInsert: { display },
              $set: { lastUsedAt: now },
              $inc: { countTotal: 1 },
            },
            upsert: true,
          },
        };
      });
      
      console.log('🏷️  Updating tag counts...');
      const tagResult = await Tag.bulkWrite(ops);
      console.log('📊 Tag update result:', {
        modifiedCount: tagResult.modifiedCount,
        upsertedCount: tagResult.upsertedCount,
        matchedCount: tagResult.matchedCount
      });
    }

    // Verify tags were created/updated
    console.log('🔍 Verifying tags in database...');
    const tags = await Tag.find({ key: { $in: tagKeys } }).sort({ countTotal: -1 });
    console.log('📋 Tags found:', tags.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    // Test search functionality
    console.log('🔎 Testing search functionality...');
    const searchResults = await Tag.find({ 
      key: { $regex: '^東', $options: 'i' } 
    }).limit(5);
    console.log('🗾 Search results for "東":', searchResults.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    // Test trending functionality  
    console.log('📈 Testing trending functionality...');
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const trendingResults = await Tag.find({ 
      lastUsedAt: { $gte: sevenDaysAgo } 
    }).sort({ countTotal: -1 }).limit(5);
    console.log('🔥 Trending tags (7 days):', trendingResults.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    console.log('🎉 [HASHTAG-TEST] All tests completed successfully!');

  } catch (error) {
    console.error('❌ [HASHTAG-TEST] Test failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the test
testHashtagFunctionality().catch(console.error);