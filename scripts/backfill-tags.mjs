import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

// HashTag utility function (copied from src/app/utils/hashtag.ts)
function extractHashtags(text) {
  if (!text || typeof text !== 'string') return [];
  const hashtagRegex = /#[\p{L}\p{N}_\u200d\u200c]+/gu;
  const matches = text.match(hashtagRegex) || [];
  return matches.map(match => {
    const display = match.slice(1); // Remove '#'
    const key = display.toLowerCase();
    return { key, display };
  });
}

// Post Model Schema
const PostSchema = new mongoose.Schema({
  title: { type: String, required: true, maxLength: 100 },
  content: { type: String, required: true, maxLength: 500 },
  author: { type: String, required: true, maxLength: 50 },
  tags: [{ type: String }],
}, {
  timestamps: true,
});

// Tag Model Schema  
const TagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true },
  display: { type: String, required: true },
  countTotal: { type: Number, default: 0 },
  lastUsedAt: { type: Date, default: Date.now }
}, {
  timestamps: true
});

const Post = mongoose.models.Post || mongoose.model('Post', PostSchema);
const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI || 'mongodb://localhost:27017/my-board-app';
console.log('Using MongoDB URI:', uri.substring(0, 30) + '...');

async function main() {
  await mongoose.connect(uri);
  const cursor = Post.find({}).cursor();
  const now = new Date();
  let processed = 0;

  for await (const doc of cursor) {
    const text = `${doc.title || ''}\n${doc.content || ''}`;
    const extracted = extractHashtags(text);
    const keys = Array.from(new Set(extracted.map(t => t.key))).slice(0, 5);
    const update = {};
    if (keys.length) update.tags = keys;
    if (Object.keys(update).length) {
      await Post.updateOne({ _id: doc._id }, { $set: update });
      const ops = keys.map(key => ({
        updateOne: {
          filter: { key },
          update: { $setOnInsert: { display: key }, $set: { lastUsedAt: now }, $inc: { countTotal: 1 } },
          upsert: true
        }
      }));
      if (ops.length) await Tag.bulkWrite(ops);
    }
    processed += 1;
    if (processed % 500 === 0) console.log('processed', processed);
  }
  console.log('done', processed);
  await mongoose.disconnect();
}

main().catch(e => { console.error(e); process.exit(1); });