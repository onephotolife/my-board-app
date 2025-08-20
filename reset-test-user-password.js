// Reset test user password to a known value
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function resetTestUserPassword() {
  try {
    await mongoose.connect('mongodb://localhost:27017/boardDB');
    console.log('Connected to MongoDB');
    
    const userSchema = new mongoose.Schema({
      name: String,
      email: String,
      password: String,
      emailVerified: Date
    });
    
    userSchema.methods.comparePassword = async function(candidatePassword) {
      return bcrypt.compare(candidatePassword, this.password);
    };
    
    const User = mongoose.models.User || mongoose.model('User', userSchema);
    
    // Reset password to known value
    const testPassword = 'TestPassword123!@#';
    const hashedPassword = await bcrypt.hash(testPassword, 12);
    
    const result = await User.updateOne(
      { email: 'one.photolife+3@gmail.com' },
      { 
        $set: { 
          password: hashedPassword,
          emailVerified: new Date() // Ensure email is verified
        }
      }
    );
    
    console.log('Update result:', result);
    
    // Verify the password
    const user = await User.findOne({ email: 'one.photolife+3@gmail.com' });
    if (user) {
      const match = await user.comparePassword(testPassword);
      console.log('Password verification:', match ? '✅ Success' : '❌ Failed');
      console.log('Email verified:', user.emailVerified);
    }
    
    console.log('\n✅ Test user password reset to:', testPassword);
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

resetTestUserPassword();