// @ts-check
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@babel/core$': '<rootDir>/node_modules/@babel/core/lib/index.js',
    '^@babel/core/package.json$': '<rootDir>/node_modules/@babel/core/package.json'
  },
  roots: ['<rootDir>/src', '<rootDir>/tests'],
  moduleDirectories: ['node_modules'],
  modulePaths: ['<rootDir>/node_modules'],
  haste: {
    throwOnModuleCollision: false,
    hasteImplModulePath: '<rootDir>/tests/setup/jest.haste.js'
  },
  testPathIgnorePatterns: [
    'node_modules_old',
    'node_modules_backup_.*',
    'node_modules_stale_.*',
    'security-fix-backup-.*'
  ],
  modulePathIgnorePatterns: [
    'node_modules_old',
    'node_modules_backup_.*',
    'node_modules_stale_.*'
  ],
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/_*.{ts,tsx}',
    '!src/app/**/page.tsx',
    '!src/**/index.{ts,tsx}'
  ],
  coverageThreshold: {
    global: { branches: 80, functions: 80, lines: 80, statements: 80 }
  },
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.spec.ts?(x)']
    },
    {
      displayName: 'a11y',
      testMatch: ['<rootDir>/tests/a11y/**/*.spec.ts?(x)']
    }
  ]
};

export default createJestConfig(customConfig);
