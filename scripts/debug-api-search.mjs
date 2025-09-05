import mongoose from 'mongoose';

// Use the same connection logic as the API
const MONGODB_URI = 'mongodb://localhost:27017/board-app';

// Import hashtag utility (duplicate to match API)
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

// Tag Schema (match API exactly)
const TagSchema = new mongoose.Schema({
  key: { type: String, required: true, unique: true, maxLength: 64 },
  display: { type: String, required: true, maxLength: 64 },
  countTotal: { type: Number, default: 1 },
  lastUsedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const Tag = mongoose.models.Tag || mongoose.model('Tag', TagSchema);

async function debugApiSearch() {
  try {
    console.log('🔍 [DEBUG-API] Testing API search logic directly...');
    
    // Connect to local MongoDB (same as API)
    console.log('🔄 Connecting to MongoDB:', MONGODB_URI);
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Test query parameters (same as would be used in API)
    const qRaw = '東'; // Same as curl query
    const limitRaw = '5';
    
    console.log('\n📥 Input parameters:');
    console.log(`  qRaw: "${qRaw}"`);
    console.log(`  limitRaw: "${limitRaw}"`);

    // Process parameters (same as API logic)
    const q = normalizeTag(qRaw);
    const limit = Math.min(Math.max(parseInt(limitRaw, 10) || 10, 1), 50);

    console.log('\n🔧 Processed parameters:');
    console.log(`  q (normalized): "${q}"`);
    console.log(`  limit: ${limit}`);

    // Check if query is empty (API early return condition)
    if (!q) {
      console.log('⚠️ Query is empty after normalization - API would return empty array');
      return;
    }

    // Build regex (same as API logic)
    const regex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    console.log('\n🔎 Search regex:');
    console.log(`  Pattern: ${regex.toString()}`);

    // Check what tags exist in the database first
    console.log('\n📋 All tags in database:');
    const allTags = await Tag.find({}).sort({ countTotal: -1 });
    allTags.forEach((tag, index) => {
      console.log(`  ${index + 1}. "${tag.key}" -> "${tag.display}" (count: ${tag.countTotal})`);
    });

    // Execute the same query as the API
    console.log('\n🔍 Executing search query...');
    const items = await Tag.find({ key: { $regex: regex } })
      .sort({ countTotal: -1 })
      .limit(limit)
      .lean();

    console.log('\n📊 Search results:');
    if (items.length === 0) {
      console.log('  No results found');
      
      // Let's debug why no results
      console.log('\n🕵️ Debugging no results:');
      
      // Try manual matches
      allTags.forEach(tag => {
        const matches = regex.test(tag.key);
        console.log(`  "${tag.key}" matches /${regex.source}/: ${matches}`);
      });
      
    } else {
      items.forEach(item => {
        console.log(`  ${item.display} (${item.key}): ${item.countTotal} uses`);
      });
    }

    // Test alternative queries
    console.log('\n🧪 Testing alternative queries:');
    
    // Try case insensitive
    const ciRegex = new RegExp('^' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const ciResults = await Tag.find({ key: { $regex: ciRegex } })
      .sort({ countTotal: -1 })
      .limit(limit)
      .lean();
    console.log(`  Case-insensitive results: ${ciResults.length}`);
    
    // Try substring match
    const substringRegex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const substringResults = await Tag.find({ key: { $regex: substringRegex } })
      .sort({ countTotal: -1 })
      .limit(limit)
      .lean();
    console.log(`  Substring results: ${substringResults.length}`);

    console.log('\n🎉 [DEBUG-API] Debug completed successfully!');

  } catch (error) {
    console.error('❌ [DEBUG-API] Debug failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the debug
debugApiSearch().catch(console.error);