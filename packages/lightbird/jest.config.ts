import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      diagnostics: { ignoreDiagnostics: [1343] },
      astTransformers: {
        before: [{
          path: 'ts-jest-mock-import-meta',
          options: { metaObjectReplacement: { url: 'file:///test' } },
        }],
      },
    }],
  },
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};

export default config;
