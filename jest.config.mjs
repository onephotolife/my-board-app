// @ts-check
import nextJest from 'next/jest.js';

const createJestConfig = nextJest({ dir: './' });

/** @type {import('jest').Config} */
const customConfig = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
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
      testMatch: ['<rootDir>/tests/unit/**/*.spec.ts?(x)'],
      testEnvironment: 'jest-environment-jsdom',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.jest.json'
          }
        ]
      }
    },
    {
      displayName: 'a11y',
      testMatch: ['<rootDir>/tests/a11y/**/*.spec.ts?(x)'],
      testEnvironment: 'jest-environment-jsdom',
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1'
      },
      transform: {
        '^.+\\.(ts|tsx)$': [
          'ts-jest',
          {
            tsconfig: 'tsconfig.jest.json'
          }
        ]
      }
    }
  ]
};

const ignoreBackup = ['node_modules_.*', '.*node_modules_backup.*', 'security-fix-backup-.*'];

const enhancedConfig = {
  ...customConfig,
  testPathIgnorePatterns: [
    ...(customConfig.testPathIgnorePatterns || []),
    ...ignoreBackup
  ],
  modulePathIgnorePatterns: [
    ...(customConfig.modulePathIgnorePatterns || []),
    ...ignoreBackup
  ],
  haste: {
    ...(customConfig.haste || {}),
    hasteImplModulePath: '<rootDir>/tests/setup/jest.haste.js'
  }
};

export default createJestConfig(enhancedConfig);
