import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { extractHashtags } from '../src/app/utils/hashtag';

// Load environment variables
dotenv.config({ path: '.env.local' });

// MongoDB Models (inline definition to avoid import issues)
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxLength: 100 },
  content: { type: String, required: true, maxLength: 500 },
  author: { type: String, required: true, maxLength: 50 },
  tags: [{ type: String, maxLength: 64 }], // Added tags field
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
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Get all posts
    const posts = await Post.find({});
    console.log(`📊 Found ${posts.length} posts to process`);

    if (posts.length === 0) {
      console.log('ℹ️  No posts found, exiting');
      return;
    }

    // Process each post and extract tags using unified implementation
    const tagMap = new Map<string, { key: string; display: string; count: number; lastUsed: Date }>();
    const postsToUpdate: Array<{ _id: any; tags: string[] }> = [];

    for (const post of posts) {
      if (!post.content) continue;

      // Use TypeScript implementation (unified)
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
          const existing = tagMap.get(key)!;
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
      console.log(`📝 Updated ${postResult.modifiedCount} posts`);
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
      console.log(`🏷️  Processed ${tagResult.modifiedCount + tagResult.upsertedCount} tags`);
    }

    console.log('✅ Backfill completed successfully');

    // Sample verification
    const sampleTags = await Tag.find({}).sort({ countTotal: -1 }).limit(5);
    console.log('\n📊 Top 5 tags after backfill:');
    for (const tag of sampleTags) {
      console.log(`  ${tag.display} (${tag.key}): ${tag.countTotal} uses`);
    }

  } catch (error) {
    console.error('❌ Backfill failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  main().catch(console.error);
}