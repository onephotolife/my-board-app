import mongoose from 'mongoose';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const uri = process.env.MONGODB_URI_PRODUCTION || process.env.MONGODB_URI;
console.log('Connecting to MongoDB...');

await mongoose.connect(uri);
console.log('Connected!');

const Post = mongoose.model('Post', new mongoose.Schema({}, { strict: false }));
const posts = await Post.find({}).limit(5);

console.log('=== Sample Post Data ===');
posts.forEach((post, i) => {
  console.log(`Post ${i + 1}:`);
  console.log('  _id:', post._id);
  console.log('  title:', post.title);
  console.log('  content:', post.content?.substring(0, 100));
  console.log('  author:', post.author);
  console.log('  tags:', post.tags);
  console.log('  createdAt:', post.createdAt);
  console.log('');
});

// Check if any posts have hashtag-like content
const hashtagPosts = await Post.find({ content: { $regex: '#' } }).limit(3);
console.log('=== Posts with # character ===');
hashtagPosts.forEach((post, i) => {
  console.log(`Hashtag post ${i + 1}:`);
  console.log('  content:', post.content);
  console.log('');
});

await mongoose.disconnect();
console.log('Disconnected');