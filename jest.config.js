// eslint-disable-next-line @typescript-eslint/no-require-imports
const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@auth/(.*)$': '<rootDir>/node_modules/@auth/$1',
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // ESMモジュールのモック
    '^next-auth$': '<rootDir>/src/__mocks__/next-auth.js',
    '^next-auth/providers/credentials$': '<rootDir>/src/__mocks__/next-auth-credentials.js',
    '^mongodb$': '<rootDir>/src/__mocks__/mongodb.js',
    '^mongoose$': '<rootDir>/src/__mocks__/mongoose.js',
    '^@/lib/db/mongodb$': '<rootDir>/src/__mocks__/db.js',
    '^@/lib/db/mongodb-local$': '<rootDir>/src/__mocks__/db.js',
    '^@/models/User$': '<rootDir>/src/__mocks__/User.js',
    '^@/lib/models/User$': '<rootDir>/src/__mocks__/User.js',
  },
  testMatch: [
    '<rootDir>/src/**/__tests__/**/*.test.[jt]s?(x)',
    '<rootDir>/src/**/*.test.[jt]s?(x)',
    '!<rootDir>/tests/**/*',  // E2Eテスト除外
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/node_modules/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(next-auth|@auth|@auth/core|jose|openid-client|bson|mongodb|mongoose|mongodb-memory-server|uuid)/)',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
    '<rootDir>/node_modules_old/',
    '<rootDir>/node_modules_backup_*/',
    '<rootDir>/tests/',  // Playwrightテスト完全除外
    '<rootDir>/e2e/',
    '<rootDir>/.auth/',  // 認証状態ファイル除外
  ],
  modulePathIgnorePatterns: [
    '<rootDir>/node_modules_old/',
    '<rootDir>/node_modules_backup_*/',
  ],
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules_backup_*/',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  testEnvironmentOptions: {
    url: 'http://localhost:3000'
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  globals: {
    'ts-jest': {
      useESM: true,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
// eslint-disable-next-line @typescript-eslint/no-require-imports
module.exports = createJestConfig(customJestConfig)