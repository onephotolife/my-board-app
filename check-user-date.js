const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({}, { strict: false });
const User = mongoose.model('User', userSchema);

async function checkUser() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app');
    console.log('Connected to MongoDB');
    
    const user = await User.findOne({ email: 'one.photolife+2@gmail.com' });
    if (user) {
      console.log('User found:');
      console.log('- _id:', user._id);
      console.log('- email:', user.email);
      console.log('- createdAt:', user.createdAt);
      console.log('- createdAt type:', typeof user.createdAt);
      console.log('- Full user object keys:', Object.keys(user.toObject()));
      
      // Check if createdAt exists in the raw document
      const rawUser = await User.collection.findOne({ email: 'one.photolife+2@gmail.com' });
      console.log('\nRaw document createdAt:', rawUser.createdAt);
      console.log('Raw document keys:', Object.keys(rawUser));
    } else {
      console.log('User not found');
    }
    
    await mongoose.disconnect();
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUser();
