module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/node_modules_old/',
    '/.next/',
    '/dist/',
    '/build/'
  ],
  modulePathIgnorePatterns: [
    '/node_modules_old/'
  ],
  roots: ['<rootDir>/tests'],
  testTimeout: 10000,
  verbose: true
};