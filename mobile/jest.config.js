module.exports = {
  preset: 'jest-expo',
  testMatch: ['**/?(*.)+(test).[tj]s?(x)'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  watchman: false,
  clearMocks: true,
};

