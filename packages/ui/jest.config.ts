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
  moduleNameMapper: {
    // Resolve workspace packages to built dist (CI builds before testing)
    '^@lightbird/core$': '<rootDir>/../lightbird/dist/index.cjs',
    '^@lightbird/core/react$': '<rootDir>/../lightbird/dist/react/index.cjs',
    '\\.css$': 'identity-obj-proxy',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.ts',
    // Mock ESM-only packages that the CJS dist externals can't resolve
    '^ass-compiler$': '<rootDir>/__mocks__/ass-compiler.ts',
    '^@ffmpeg/ffmpeg$': '<rootDir>/__mocks__/@ffmpeg/ffmpeg.ts',
    '^@ffmpeg/util$': '<rootDir>/__mocks__/@ffmpeg/util.ts',
  },
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};

export default config;
