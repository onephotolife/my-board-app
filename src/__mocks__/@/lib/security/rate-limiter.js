// レート制限のモック
class RateLimiter {
  constructor(options) {
    this.options = options;
  }

  async consume(key) {
    // デフォルトではレート制限に引っかからない
    return Promise.resolve({
      remainingPoints: 10,
      msBeforeNext: 0,
      consumedPoints: 1,
      isFirstInDuration: false,
    });
  }

  async delete(key) {
    return Promise.resolve();
  }

  async get(key) {
    return Promise.resolve({
      remainingPoints: 10,
      msBeforeNext: 0,
      consumedPoints: 1,
      isFirstInDuration: false,
    });
  }
}

module.exports = { RateLimiter };