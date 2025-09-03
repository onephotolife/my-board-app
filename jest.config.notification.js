module.exports = {
  displayName: 'Notification UI Tests',
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  testMatch: [
    '**/__tests__/**/Notification*.test.ts',
    '**/__tests__/**/Notification*.test.tsx',
    '**/__tests__/**/useNotifications.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react',
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
      },
    }],
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup/jest.setup.ts'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/components/NotificationBell.tsx',
    'src/hooks/useNotifications.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!**/__tests__/**',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  coverageReporters: ['text', 'lcov', 'html'],
  reporters: [
    'default',
    ['jest-junit', {
      outputDirectory: './test-results',
      outputName: 'junit-notification.xml',
      suiteName: 'Notification UI Tests',
      classNameTemplate: '{classname}',
      titleTemplate: '{title}',
      ancestorSeparator: ' › ',
      usePathForSuiteName: true,
    }],
    ['jest-html-reporters', {
      publicPath: './test-results/html',
      filename: 'notification-test-report.html',
      pageTitle: 'Notification UI Test Report',
      expand: true,
      showPassed: true,
      showFailed: true,
      showPending: true,
      showSkipped: true,
    }],
  ],
  verbose: true,
  testTimeout: 30000,
};