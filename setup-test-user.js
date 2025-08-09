const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function setupTestUser() {
  try {
    // Use the correct database name from environment or default
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/boardDB';
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB (board-app database)');
    
    // Define User schema matching the app
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      emailVerified: Date,
      createdAt: { type: Date, default: Date.now }
    });
    
    userSchema.methods.comparePassword = async function(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    // Check if user exists
    const existingUser = await User.findOne({ email: 'one.photolife+3@gmail.com' });
    if (existingUser) {
      console.log('User already exists:', existingUser.email);
      console.log('Email verified:', existingUser.emailVerified);
      // Update to ensure emailVerified is set
      if (!existingUser.emailVerified) {
        existingUser.emailVerified = new Date();
        await existingUser.save();
        console.log('Updated emailVerified field');
      }
    } else {
      // Create test user
      const hashedPassword = await bcrypt.hash('OldPassword123!', 12);
      const user = await User.create({
        name: 'Test User',
        email: 'one.photolife+3@gmail.com',
        password: hashedPassword,
        emailVerified: new Date()
      });
      console.log('✅ Test user created:', user.email);
      console.log('Email verified:', user.emailVerified);
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

setupTestUser();