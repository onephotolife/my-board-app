// MongoDB接続のモック
const connectToDatabase = jest.fn().mockResolvedValue({
  isConnected: true,
  connection: {
    readyState: 1,
    db: {
      databaseName: 'test-db',
    },
    host: 'localhost',
  },
});

module.exports = {
  connectToDatabase,
};