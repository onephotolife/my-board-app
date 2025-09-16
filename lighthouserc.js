module.exports = {
  ci: {
    collect: {
      url: ['http://localhost:3000/search?q=%E3%82%84%E3%81%BE'],
      numberOfRuns: 3,
      startServerCommand: 'npm run build:next && npm run start:next',
      startServerReadyPattern: 'started server on',
      settings: { preset: 'desktop' },
    },
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.85 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
      },
    },
    upload: { target: 'temporary-public-storage' },
  },
};
