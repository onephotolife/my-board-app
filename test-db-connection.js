const mongoose = require('mongoose');

async function testConnection() {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-db';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('✅ MongoDB connected successfully');
    
    // Test if we can query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('Collections:', collections.map(c => c.name));
    
    await mongoose.connection.close();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
  }
}

testConnection();
