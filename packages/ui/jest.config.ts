import type { Config } from 'jest';

const config: Config = {
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/__tests__'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(\\.pnpm|lightbird|@lightbird)/)',
  ],
  moduleNameMapper: {
    '^lightbird$': '<rootDir>/../lightbird/src/index.ts',
    '^lightbird/react$': '<rootDir>/../lightbird/src/react/index.ts',
    '\\.css$': 'identity-obj-proxy',
    '^lucide-react$': '<rootDir>/__mocks__/lucide-react.ts',
    '.*/workers/create-worker': '<rootDir>/__mocks__/create-worker.ts',
    '^ass-compiler$': '<rootDir>/__mocks__/ass-compiler.ts',
    '^@ffmpeg/ffmpeg$': '<rootDir>/__mocks__/@ffmpeg/ffmpeg.ts',
    '^@ffmpeg/util$': '<rootDir>/__mocks__/@ffmpeg/util.ts',
    '^chardet$': '<rootDir>/__mocks__/chardet.ts',
  },
  setupFilesAfterEnv: ['../../jest.setup.ts'],
};

export default config;
