import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Import hashtag utility
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

// MongoDB Models
const TagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxLength: 64 },
  display: { type: String, required: true, maxLength: 64 },
  countTotal: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

async function debugSearch() {
  try {
    console.log('🔍 [DEBUG] Starting search debug...');
    
    // Connect to MongoDB
    const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app';
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    // Check what tags exist
    console.log('\n📋 All tags in database:');
    const allTags = await Tag.find({}).sort({ countTotal: -1 }).limit(10);
    allTags.forEach(tag => {
      console.log(`  ${tag.display} (key: "${tag.key}", count: ${tag.countTotal})`);
    });

    // Test normalization
    const testQuery = '東';
    const normalizedQuery = normalizeTag(testQuery);
    console.log(`\n🔧 Query normalization:`);
    console.log(`  Original: "${testQuery}"`);
    console.log(`  Normalized: "${normalizedQuery}"`);
    console.log(`  Are they equal? ${testQuery === normalizedQuery}`);

    // Test regex search (same as API)
    console.log(`\n🔎 Testing regex search like API:`);
    const regex = new RegExp('^' + normalizedQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    console.log(`  Regex pattern: ${regex.toString()}`);
    
    const apiSearchResults = await Tag.find({ key: { $regex: regex } })
      .sort({ countTotal: -1 })
      .limit(5)
      .lean();
    console.log(`  API-style search results:`, apiSearchResults.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    // Test simple prefix search without normalization
    console.log(`\n🔍 Testing simple prefix search without normalization:`);
    const simpleRegex = new RegExp('^' + testQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    console.log(`  Simple regex pattern: ${simpleRegex.toString()}`);
    
    const simpleResults = await Tag.find({ key: { $regex: simpleRegex } })
      .sort({ countTotal: -1 })
      .limit(5)
      .lean();
    console.log(`  Simple search results:`, simpleResults.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    // Test case insensitive search
    console.log(`\n🔍 Testing case-insensitive search:`);
    const ciRegex = new RegExp('^' + testQuery.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    console.log(`  Case-insensitive regex pattern: ${ciRegex.toString()}`);
    
    const ciResults = await Tag.find({ key: { $regex: ciRegex } })
      .sort({ countTotal: -1 })
      .limit(5)
      .lean();
    console.log(`  Case-insensitive search results:`, ciResults.map(t => ({ key: t.key, display: t.display, count: t.countTotal })));

    console.log('\n🎉 [DEBUG] Debug completed successfully!');

  } catch (error) {
    console.error('❌ [DEBUG] Debug failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugSearch().catch(console.error);