import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^lightbird$': '<rootDir>/../lightbird/src/index.ts',
    '^lightbird/react$': '<rootDir>/../lightbird/src/react/index.ts',
    '\\.css$': 'identity-obj-proxy',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.ts',
    // Avoid import.meta.url parse error from mkv-player
    '.*/workers/create-worker': '<rootDir>/__mocks__/create-worker.ts',
    // Mock ESM packages that ts-jest can't handle
    '^ass-compiler$': '<rootDir>/__mocks__/ass-compiler.ts',
    '^@ffmpeg/ffmpeg$': '<rootDir>/__mocks__/@ffmpeg/ffmpeg.ts',
    '^@ffmpeg/util$': '<rootDir>/__mocks__/@ffmpeg/util.ts',
  },
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};

export default config;
