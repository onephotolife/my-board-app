import '@testing-library/jest-dom'
import { TextEncoder, TextDecoder } from 'util';

// Add TextEncoder and TextDecoder polyfills
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// テスト環境の設定
process.env.NODE_ENV = 'test';
process.env.AUTH_SECRET = 'test-secret-key-for-auth-testing-purposes';
process.env.NEXTAUTH_SECRET = 'test-secret-key-for-auth-testing-purposes';
process.env.NEXTAUTH_URL = 'http://localhost:3000';
process.env.SEND_EMAILS = 'false'; // テスト時はメール送信無効
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';

// グローバルなテストタイムアウト設定
jest.setTimeout(30000); // 30秒

// グローバルオブジェクトのモック
global.Request = jest.fn((url, init) => ({
  url,
  method: init?.method || 'GET',
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest.fn(() => Promise.resolve(init?.body ? JSON.parse(init.body) : {})),
}));

global.Response = jest.fn((body, init) => ({
  body,
  status: init?.status || 200,
  headers: new Map(Object.entries(init?.headers || {})),
  json: jest.fn(() => Promise.resolve(body ? JSON.parse(body) : {})),
}));

// NextResponse mock
global.NextResponse = {
  json: jest.fn((data, init) => ({
    body: JSON.stringify(data),
    status: init?.status || 200,
    headers: new Map(Object.entries(init?.headers || {})),
    json: jest.fn(() => Promise.resolve(data)),
  }))
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    pathname: '/',
    query: {},
  })),
  useSearchParams: jest.fn(() => ({
    get: jest.fn(),
  })),
  usePathname: jest.fn(() => '/'),
}))

// NextAuth のモック設定
jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => ({
    data: null,
    status: 'loading',
  })),
  signIn: jest.fn(),
  signOut: jest.fn(),
  getSession: jest.fn(),
  SessionProvider: ({ children }) => children,
}));

// MongoDB Memory Server のモック
jest.mock('mongodb-memory-server', () => ({
  MongoMemoryServer: class {
    static async create() {
      return new this();
    }
    
    async getUri() {
      return 'mongodb://localhost:27017/test';
    }
    
    async stop() {
      return undefined;
    }
    
    async cleanup() {
      return undefined;
    }
  },
}));

// フェッチAPIのモック
global.fetch = jest.fn();

// テスト用ユーティリティ関数
global.testUtils = {
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  generateTestEmail: () => `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`,
  generateTestUser: () => ({
    email: global.testUtils.generateTestEmail(),
    password: 'TestPassword123!',
    name: `Test User ${Date.now()}`,
  }),
};