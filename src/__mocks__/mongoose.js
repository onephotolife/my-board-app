// Mongoose Mock
const mockSchema = function Schema(definition, options) {
  this.definition = definition;
  this.options = options;
  this.methods = {};
  this.statics = {};
  this.virtuals = {};
  this.pre = jest.fn();
  this.post = jest.fn();
  this.index = jest.fn();
  this.set = jest.fn();
  this.virtual = jest.fn((_name) => ({
    get: jest.fn(),
    set: jest.fn(),
  }));
};

const mockModel = {
  find: jest.fn(() => ({
    sort: jest.fn(() => ({
      limit: jest.fn(() => Promise.resolve([])),
      exec: jest.fn(() => Promise.resolve([])),
    })),
    exec: jest.fn(() => Promise.resolve([])),
  })),
  findOne: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve(null)),
  })),
  findById: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve(null)),
  })),
  create: jest.fn(() => Promise.resolve({})),
  updateOne: jest.fn(() => Promise.resolve({ acknowledged: true })),
  deleteOne: jest.fn(() => Promise.resolve({ acknowledged: true })),
  deleteMany: jest.fn(() => Promise.resolve({ acknowledged: true })),
  countDocuments: jest.fn(() => Promise.resolve(0)),
  save: jest.fn(() => Promise.resolve({})),
};

const mongoose = {
  connect: jest.fn(() => {
    mongoose.connection.readyState = 1;
    return Promise.resolve(mongoose);
  }),
  disconnect: jest.fn(() => {
    mongoose.connection.readyState = 0;
    return Promise.resolve();
  }),
  connection: {
    readyState: 1, // デフォルトで接続済み
    on: jest.fn(),
    once: jest.fn(),
    close: jest.fn(),
    db: {
      dropDatabase: jest.fn(() => Promise.resolve()),
      databaseName: 'test-db',
      collections: jest.fn(() => Promise.resolve([])),
    },
    collections: {},
  },
  Schema: mockSchema,
  model: jest.fn((_name, _schema) => {
    const Model = function(data) {
      Object.assign(this, data);
      this.save = jest.fn(() => Promise.resolve(this));
      this.validate = jest.fn(() => Promise.resolve());
      this._id = { toString: () => '507f1f77bcf86cd799439011' };
      this.toJSON = jest.fn(() => ({ ...this, _id: this._id.toString() }));
      this.isModified = jest.fn(() => false);
    };
    Object.assign(Model, mockModel);
    return Model;
  }),
  models: {},
  Types: {
    ObjectId: jest.fn((id) => ({
      toString: () => id || '507f1f77bcf86cd799439011',
    })),
  },
  Document: function() {},
};

module.exports = mongoose;
module.exports.default = mongoose;