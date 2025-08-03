import mongoose from 'mongoose';
import dbConnect from '../mongodb';

// Mongooseのモック
jest.mock('mongoose', () => ({
  connect: jest.fn(),
  connection: {
    readyState: 0,
  },
}));

describe('dbConnect', () => {
  beforeEach(() => {
    // グローバル変数をリセット
    delete (global as any).mongoose;
    jest.clearAllMocks();
    
    // 環境変数を設定
    process.env.MONGODB_URI = 'mongodb://test:27017/test-db';
  });

  afterEach(() => {
    delete (global as any).mongoose;
  });

  it('connects to MongoDB when not cached', async () => {
    const mockMongoose = { connected: true };
    (mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose);

    const result = await dbConnect();

    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://test:27017/test-db',
      { bufferCommands: false }
    );
    expect(result).toBe(mockMongoose);
  });

  it('returns cached connection when already connected', async () => {
    const mockMongoose = { connected: true };
    (mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose);

    // 最初の接続
    const firstResult = await dbConnect();
    expect(mongoose.connect).toHaveBeenCalledTimes(1);

    // 2回目の接続（キャッシュから）
    const secondResult = await dbConnect();
    expect(mongoose.connect).toHaveBeenCalledTimes(1); // 追加の接続はない
    expect(secondResult).toBe(firstResult);
  });

  it('handles connection errors', async () => {
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValue(error);

    await expect(dbConnect()).rejects.toThrow('Connection failed');
    expect(mongoose.connect).toHaveBeenCalled();
  });

  it('retries on connection failure', async () => {
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock)
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ connected: true });

    // 最初の試行は失敗
    await expect(dbConnect()).rejects.toThrow('Connection failed');
    
    // グローバル変数をリセット
    const cached = (global as any).mongoose;
    if (cached) {
      cached.promise = null;
    }
    
    // 2回目の試行は成功
    const result = await dbConnect();
    expect(result).toEqual({ connected: true });
    expect(mongoose.connect).toHaveBeenCalledTimes(2);
  });

  it('uses default MongoDB URI when environment variable is not set', async () => {
    delete process.env.MONGODB_URI;
    const mockMongoose = { connected: true };
    (mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose);

    await dbConnect();

    expect(mongoose.connect).toHaveBeenCalledWith(
      'mongodb://localhost:27017/board-app',
      { bufferCommands: false }
    );
  });

  it('logs success message on successful connection', async () => {
    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
    const mockMongoose = { connected: true };
    (mongoose.connect as jest.Mock).mockResolvedValue(mockMongoose);

    await dbConnect();

    expect(consoleSpy).toHaveBeenCalledWith('MongoDB connected successfully');
    consoleSpy.mockRestore();
  });

  it('logs error message on connection failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Connection failed');
    (mongoose.connect as jest.Mock).mockRejectedValue(error);

    await expect(dbConnect()).rejects.toThrow('Connection failed');

    expect(consoleSpy).toHaveBeenCalledWith('MongoDB connection error:', error);
    consoleSpy.mockRestore();
  });
});