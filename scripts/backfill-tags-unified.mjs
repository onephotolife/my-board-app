import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Exact implementation from src/app/utils/hashtag.ts (unified)
const HASHTAG_REGEX = /#([\p{L}\p{N}_\p{M}\p{Extended_Pictographic}\p{Emoji_Presentation}]+(?:\u200D[\p{Extended_Pictographic}\p{Emoji_Presentation}]+)*)/gu;
const VARIATION_SELECTOR_REGEX = /\uFE0E|\uFE0F/gu; // 異体字セレクタ

function normalizeTag(raw) {
  if (!raw) return '';
  let s = raw.normalize('NFKC');
  s = s.replace(VARIATION_SELECTOR_REGEX, '');
  s = s.replace(/^#+/, '');
  s = s.trim();
  // ASCII小文字化（多言語はそのまま）
  s = s.replace(/[A-Z]/g, (c) => c.toLowerCase());
  // 長さ制約
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
  author: { type: String, required: true, maxLength: 50 },
  tags: [{ type: String, maxLength: 64 }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

const TagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxLength: 64 },
  display: { type: String, required: true, maxLength: 64 },
  countTotal: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now }
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

async function main() {
  try {
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
    console.log('🔄 Connecting to MongoDB...');
    console.log('🔍 [DEBUG] Environment:', process.env.MONGODB_ENV);
    console.log('🔍 [DEBUG] Has production URI:', !!process.env.MONGODB_URI_PRODUCTION);
    
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    console.log('📊 [Info] Database:', mongoose.connection.db.databaseName);
    console.log('📊 [Info] Host:', mongoose.connection.host);

    // Get all posts
    const posts = await Post.find({});
    console.log(`📊 Found ${posts.length} posts to process`);

    if (posts.length === 0) {
      console.log('ℹ️  No posts found, exiting');
      return;
    }

    // Sample verification - compare implementations
    console.log('\n=== DRIFT VERIFICATION ===');
    const samplePost = posts.find(p => p.content && p.content.includes('#'));
    if (samplePost) {
      console.log('Sample content:', samplePost.content.substring(0, 100));
      
      // Old MJS implementation (drift-prone)
      function extractHashtags_OLD(text) {
        if (!text || typeof text !== 'string') return [];
        const hashtagRegex = /#[\p{L}\p{N}_\u200d\u200c]+/gu;
        const matches = text.match(hashtagRegex) || [];
        return matches.map(match => {
          const display = match.slice(1);
          const key = display.toLowerCase();
          return { key, display };
        });
      }
      
      const oldResults = extractHashtags_OLD(samplePost.content);
      const newResults = extractHashtags(samplePost.content);
      
      console.log('OLD (drift-prone):', oldResults.length, 'tags');
      console.log('NEW (unified):', newResults.length, 'tags');
      console.log('FIXED DRIFT:', oldResults.length !== newResults.length ? 'YES' : 'NO');
    }

    // Process each post and extract tags using unified implementation
    const tagMap = new Map();
    const postsToUpdate = [];

    for (const post of posts) {
      if (!post.content) continue;

      // Use unified implementation
      const extractedTags = extractHashtags(post.content);
      const tagKeys = extractedTags.map(tag => tag.key);

      // Track for post update
      postsToUpdate.push({
        _id: post._id,
        tags: tagKeys.slice(0, 5) // Max 5 tags per post
      });

      // Aggregate tag counts
      for (const { key, display } of extractedTags) {
        if (tagMap.has(key)) {
          const existing = tagMap.get(key);
          existing.count++;
          existing.lastUsed = new Date(Math.max(existing.lastUsed.getTime(), post.updatedAt?.getTime() || post.createdAt.getTime()));
          // Keep first display format encountered
        } else {
          tagMap.set(key, {
            key,
            display,
            count: 1,
            lastUsed: post.updatedAt || post.createdAt
          });
        }
      }
    }

    console.log(`🏷️  Found ${tagMap.size} unique tags`);

    // Update posts with tags
    if (postsToUpdate.length > 0) {
      const postBulkOps = postsToUpdate.map(({ _id, tags }) => ({
        updateOne: {
          filter: { _id },
          update: { $set: { tags } }
        }
      }));

      const postResult = await Post.bulkWrite(postBulkOps);
      console.log(`📝 Updated ${postResult.modifiedCount} posts with tags`);
    }

    // Update Tag collection
    if (tagMap.size > 0) {
      const tagBulkOps = Array.from(tagMap.values()).map(({ key, display, count, lastUsed }) => ({
        updateOne: {
          filter: { key },
          update: {
            $set: { display, lastUsedAt: lastUsed },
            $inc: { countTotal: count }
          },
          upsert: true
        }
      }));

      const tagResult = await Tag.bulkWrite(tagBulkOps);
      console.log(`🏷️  Processed ${tagResult.upsertedCount} new + ${tagResult.modifiedCount} updated tags`);
    }

    console.log('\n✅ Unified backfill completed successfully');

    // Sample verification
    const sampleTags = await Tag.find({}).sort({ countTotal: -1 }).limit(5);
    console.log('\n📊 Top 5 tags after unified backfill:');
    for (const tag of sampleTags) {
      console.log(`  ${tag.display} (${tag.key}): ${tag.countTotal} uses`);
    }

  } catch (error) {
    console.error('❌ Unified backfill failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (import.meta.url === new URL(import.meta.url).href && process.argv[1] === new URL(import.meta.url).pathname) {
  main().catch(console.error);
}