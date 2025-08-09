// Debug password update issue
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

async function debugPasswordUpdate() {
  try {
    await mongoose.connect('mongodb://localhost:27017/boardDB');
    console.log('Connected to MongoDB');
    
    // Check collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    // Check passwordresets collection
    const passwordResets = await mongoose.connection.db.collection('passwordresets').find({
      email: 'one.photolife+3@gmail.com',
      used: false
    }).toArray();
    
    console.log('\nPassword Reset Tokens:');
    passwordResets.forEach(pr => {
      console.log('- Token:', pr.token ? pr.token.substring(0, 20) + '...' : 'null');
      console.log('  Expires:', pr.expiresAt);
      console.log('  Used:', pr.used);
    });
    
    // Check user
    const users = await mongoose.connection.db.collection('users').find({
      email: 'one.photolife+3@gmail.com'
    }).toArray();
    
    console.log('\nUser in DB:');
    for (const user of users) {
      console.log('- Email:', user.email);
      console.log('  Password hash:', user.password ? user.password.substring(0, 30) + '...' : 'null');
      console.log('  Email verified:', user.emailVerified);
      
      // Check if old password still works
      const oldPasswords = ['OldPassword123!', 'NewSecure123!@#'];
      for (const pwd of oldPasswords) {
        const match = await bcrypt.compare(pwd, user.password);
        console.log(`  Password "${pwd}" matches:`, match);
      }
    }
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

debugPasswordUpdate();