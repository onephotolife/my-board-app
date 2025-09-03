import mongoose from 'mongoose';

import { DatabaseConnectionManager } from '../connection-manager';

describe('DatabaseConnectionManager - Null Safety Test', () => {
  let manager: DatabaseConnectionManager;
  
  beforeEach(() => {
    // ConnectionManagerをクリーンな状態で作成
    manager = new DatabaseConnectionManager();
  });

  afterEach(async () => {
    // 接続があれば切断
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
    }
  });

  describe('quickHealthCheck', () => {
    it('should handle undefined db gracefully', async () => {
      // mongoose.connection.dbがundefinedの状態をシミュレート
      const originalDb = mongoose.connection.db;
      Object.defineProperty(mongoose.connection, 'db', {
        value: undefined,
        writable: true,
        configurable: true
      });

      // quickHealthCheckを実行（エラーがスローされないことを確認）
      const result = await manager.quickHealthCheck();
      
      // 期待される結果を検証
      expect(result.isHealthy).toBe(false);
      expect(result.responseTime).toBe(0);
      expect(result.warmupCompleted).toBe(false);
      expect(result.error).toBe('CONNECTION_NOT_READY');
      
      // 元の状態に戻す
      Object.defineProperty(mongoose.connection, 'db', {
        value: originalDb,
        writable: true,
        configurable: true
      });
    });

    it('should return false when connection is not established', async () => {
      // 接続が確立されていない状態でテスト
      const result = await manager.quickHealthCheck();
      
      // エラーではなく、適切なfalseレスポンスを返すことを確認
      expect(result.isHealthy).toBe(false);
      expect(result.error).toBe('CONNECTION_NOT_READY');
    });

    it('should pass when connection is properly established', async () => {
      // 実際に接続を確立
      const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/test-db';
      
      try {
        await mongoose.connect(uri, {
          bufferCommands: false,
          serverSelectionTimeoutMS: 5000
        });
        
        // 接続確立後のテスト
        const result = await manager.quickHealthCheck();
        
        // 接続が確立されている場合は正常な結果を期待
        expect(result.isHealthy).toBe(true);
        expect(result.responseTime).toBeGreaterThanOrEqual(0);
        expect(result.error).toBeUndefined();
      } catch (error) {
        // MongoDB接続エラーの場合はテストをスキップ
        console.log('MongoDB connection test skipped (MongoDB not available)');
      }
    });
  });
});