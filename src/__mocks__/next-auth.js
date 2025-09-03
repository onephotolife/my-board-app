/**
 * Next-Auth モック
 * ESモジュール問題回避用
 */

const mockSession = {
  user: {
    id: 'session-123', // テストでgenerateCSRFTokenForRequestに渡すsessionIdと一致
    email: 'test@example.com',
    emailVerified: true
  }
};

// getServerSession モック
const getServerSession = jest.fn().mockResolvedValue(mockSession);

// NextAuth デフォルトエクスポート - 関数として動作するようにする
const NextAuth = jest.fn().mockImplementation((authOptions) => {
  return {
    GET: jest.fn(),
    POST: jest.fn(),
    authOptions // authOptionsを保持
  };
});

// CommonJS エクスポート
module.exports = NextAuth;
module.exports.default = NextAuth;
module.exports.getServerSession = getServerSession;