import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    // Redirect the create-worker module (which uses import.meta.url)
    // to a mock that avoids the CJS parse error
    '.*/workers/create-worker': '<rootDir>/__mocks__/create-worker.ts',
  },
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};

export default config;
