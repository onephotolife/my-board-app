import { MongoClient, Db } from 'mongodb';
import bcrypt from 'bcryptjs';

export class DatabaseHelper {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  
  async connect(): Promise<void> {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/board-app-test';
    this.client = new MongoClient(mongoUri);
    await this.client.connect();
    this.db = this.client.db();
  }
  
  async createTestUsers(count: number = 10): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const users = [];
    const prefix = process.env.TEST_USER_EMAIL_PREFIX || 'e2e_test_';
    
    for (let i = 1; i <= count; i++) {
      const hashedPassword = await bcrypt.hash('Test1234!', 10);
      users.push({
        email: `${prefix}${i}@example.com`,
        password: hashedPassword,
        name: `E2E Test User ${i}`,
        emailVerified: false,
        emailVerificationToken: null,
        emailVerificationTokenExpiry: null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    
    try {
      await this.db.collection('users').insertMany(users);
      console.log(`✅ Created ${count} test users`);
    } catch (error) {
      // Users might already exist, update them instead
      for (const user of users) {
        await this.db.collection('users').updateOne(
          { email: user.email },
          { $set: user },
          { upsert: true }
        );
      }
      console.log(`✅ Updated ${count} test users`);
    }
  }
  
  async cleanupTestData(): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const prefix = process.env.TEST_USER_EMAIL_PREFIX || 'e2e_test_';
    
    // Delete test users
    const userResult = await this.db.collection('users').deleteMany({
      email: new RegExp(`^${prefix}`)
    });
    console.log(`🗑️ Deleted ${userResult.deletedCount} test users`);
    
    // Clear ResendHistory for test users
    const historyResult = await this.db.collection('resendhistories').deleteMany({
      email: new RegExp(`^${prefix}`)
    });
    console.log(`🗑️ Deleted ${historyResult.deletedCount} resend histories`);
    
    // Clear RateLimit entries
    const rateLimitResult = await this.db.collection('ratelimits').deleteMany({
      key: new RegExp(`^resend:${prefix}`)
    });
    console.log(`🗑️ Deleted ${rateLimitResult.deletedCount} rate limit entries`);
  }
  
  async getResendHistory(email: string): Promise<any> {
    if (!this.db) throw new Error('Database not connected');
    
    const user = await this.db.collection('users').findOne({ email });
    if (!user) return null;
    
    return await this.db.collection('resendhistories').findOne({ 
      userId: user._id 
    });
  }
  
  async resetUserVerification(email: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    await this.db.collection('users').updateOne(
      { email },
      {
        $set: {
          emailVerified: false,
          emailVerificationToken: null,
          emailVerificationTokenExpiry: null,
          updatedAt: new Date()
        }
      }
    );
  }
  
  async clearResendHistoryForUser(email: string): Promise<void> {
    if (!this.db) throw new Error('Database not connected');
    
    const user = await this.db.collection('users').findOne({ email });
    if (!user) return;
    
    await this.db.collection('resendhistories').deleteOne({ 
      userId: user._id 
    });
  }
  
  async getUserStats(email: string): Promise<{
    exists: boolean;
    emailVerified: boolean;
    resendAttempts: number;
  }> {
    if (!this.db) throw new Error('Database not connected');
    
    const user = await this.db.collection('users').findOne({ email });
    if (!user) {
      return { exists: false, emailVerified: false, resendAttempts: 0 };
    }
    
    const history = await this.db.collection('resendhistories').findOne({ 
      userId: user._id 
    });
    
    return {
      exists: true,
      emailVerified: user.emailVerified || false,
      resendAttempts: history?.attempts?.length || 0
    };
  }
  
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
    }
  }
}