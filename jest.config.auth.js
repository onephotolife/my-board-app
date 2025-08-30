/** 
 * Jest設定 - 認証付きテスト用
 * 認証必須: one.photolife+1@gmail.com / ?@thc123THC@?
 */

module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts', '**/tests/**/*.test.tsx'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        skipLibCheck: true,
        moduleResolution: 'node'
      }
    }]
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy'
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup-auth.js'],
  testTimeout: 30000, // 認証に時間がかかる可能性
  verbose: true,
  collectCoverage: false,
  testPathIgnorePatterns: [
    '/node_modules/',
    '/node_modules_old/',
    '/.next/',
    '/out/'
  ],
  globals: {
    'ts-jest': {
      isolatedModules: true
    },
    AUTH_EMAIL: 'one.photolife+1@gmail.com',
    AUTH_PASSWORD: '?@thc123THC@?'
  }
};