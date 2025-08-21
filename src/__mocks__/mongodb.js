// MongoDB Mock
const mockCollection = {
  findOne: jest.fn(),
  find: jest.fn(() => ({
    toArray: jest.fn(),
    limit: jest.fn(() => ({ toArray: jest.fn() })),
    sort: jest.fn(() => ({ toArray: jest.fn() })),
  })),
  insertOne: jest.fn(),
  updateOne: jest.fn(),
  deleteOne: jest.fn(),
  countDocuments: jest.fn(),
};

const mockDb = {
  collection: jest.fn(() => mockCollection),
};

const mockClient = {
  connect: jest.fn(),
  close: jest.fn(),
  db: jest.fn(() => mockDb),
};

const MongoClient = jest.fn(() => mockClient);
MongoClient.connect = jest.fn(() => Promise.resolve(mockClient));

const ObjectId = jest.fn((id) => ({
  toString: () => id || '507f1f77bcf86cd799439011',
  toHexString: () => id || '507f1f77bcf86cd799439011',
  equals: jest.fn(),
}));

ObjectId.isValid = jest.fn(() => true);
ObjectId.createFromHexString = jest.fn((hex) => new ObjectId(hex));

module.exports = {
  MongoClient,
  ObjectId,
  mockClient,
  mockDb,
  mockCollection,
};