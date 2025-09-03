// User model mock
const bcrypt = require('bcryptjs');

class UserMock {
  constructor(data) {
    Object.assign(this, data);
    this._id = { toString: () => '507f1f77bcf86cd799439011' };
    
    // メールアドレスを小文字に変換
    if (this.email && typeof this.email === 'string') {
      this.email = this.email.toLowerCase();
    }
    
    // 名前をトリム
    if (this.name && typeof this.name === 'string') {
      this.name = this.name.trim();
    }
    
    // デフォルト値の設定
    this.role = this.role || 'user';
    this.emailVerified = this.emailVerified ?? false;
    this.passwordHistory = this.passwordHistory || [];
    this.passwordResetCount = this.passwordResetCount || 0;
    if (this.password) {
      this.lastPasswordChange = new Date();
    }
  }

  async save() {
    // パスワードのハッシュ化（bcryptモックと連携）
    if (this.password && !this.password.startsWith('$2')) {
      const originalPassword = this.password;
      // bcryptがモックされているので、直接モックされた形式を使用
      this.password = `$2a$10$hashed_${originalPassword}`;
    }
    
    // タイムスタンプの自動設定
    if (!this.createdAt) {
      this.createdAt = new Date();
    }
    this.updatedAt = new Date();
    
    return this;
  }

  async validate() {
    const error = new Error('Validation failed');
    error.errors = {};
    
    // 必須フィールドのチェック
    if (!this.email) error.errors.email = { message: 'メールアドレスは必須です' };
    if (!this.password) error.errors.password = { message: 'パスワードは必須です' };
    if (!this.name) error.errors.name = { message: '名前は必須です' };
    
    // メールアドレスの形式チェック
    if (this.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.email)) {
        error.errors.email = { message: '有効なメールアドレスを入力してください' };
      }
    }
    
    if (Object.keys(error.errors).length > 0) {
      throw error;
    }
    return true;
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password;
    return obj;
  }

  isModified(_field) {
    return false;
  }
}

// findOneをより柔軟にモック可能にする
UserMock.findOne = jest.fn(async (_query) => {
  // モックの戻り値は各テストで設定される
  return null;
});

UserMock.findById = jest.fn((_id) => ({
  exec: jest.fn(() => Promise.resolve(null)),
  lean: jest.fn(() => ({
    exec: jest.fn(() => Promise.resolve(null))
  }))
}));
UserMock.findByIdAndUpdate = jest.fn((_id, update, _options) => {
  const user = new UserMock(update);
  return Promise.resolve(user);
});
UserMock.findByIdAndDelete = jest.fn((_id) => Promise.resolve({ deletedCount: 1 }));
UserMock.create = jest.fn((data) => {
  const user = new UserMock(data);
  // save()と同じ処理を行う
  if (user.password && !user.password.startsWith('$2')) {
    user.password = `$2a$10$hashed_${user.password}`;
  }
  return Promise.resolve(user);
});
UserMock.deleteMany = jest.fn(() => Promise.resolve({ deletedCount: 0 }));
UserMock.countDocuments = jest.fn(() => Promise.resolve(0));
UserMock.findOneAndUpdate = jest.fn((_query, update, _options) => {
  const user = new UserMock(update);
  return Promise.resolve(user);
});

module.exports = UserMock;
module.exports.default = UserMock;