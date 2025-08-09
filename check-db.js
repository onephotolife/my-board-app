const mongoose = require('mongoose');

async function checkDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/boardDB');
    console.log('Connected to boardDB');
    
    // Get all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\nCollections:', collections.map(c => c.name));
    
    // Check users collection
    const users = await mongoose.connection.db.collection('users').find({}).toArray();
    console.log('\nUsers in database:');
    users.forEach(user => {
      console.log(`- ${user.email}, emailVerified: ${user.emailVerified}`);
    });
    
    await mongoose.connection.close();
  } catch (error) {
    console.error('Error:', error);
  }
}

checkDB();
