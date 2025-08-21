// Database connection mock
const connectDB = jest.fn(() => Promise.resolve({
  connection: {
    readyState: 1,
    db: {
      databaseName: 'test-db',
      collections: jest.fn(() => Promise.resolve([])),
    },
  },
}));

const connectToDatabase = jest.fn(() => Promise.resolve({
  db: {
    collection: jest.fn(() => ({
      findOne: jest.fn(),
      find: jest.fn(() => ({
        toArray: jest.fn(() => Promise.resolve([])),
      })),
      insertOne: jest.fn(),
      updateOne: jest.fn(),
      deleteOne: jest.fn(),
    })),
  },
}));

module.exports = {
  connectDB,
  connectToDatabase,
};