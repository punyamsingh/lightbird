import type { Config } from "jest";

/**
 * Web-app unit tests. Covers framework-agnostic logic (e.g. playground snippet
 * generation) with ts-jest — no Next.js runtime needed for these pure modules.
 */
const config: Config = {
  testEnvironment: "node",
  roots: ["<rootDir>/__tests__"],
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: {
          jsx: "react-jsx",
          module: "commonjs",
          esModuleInterop: true,
          isolatedModules: true,
        },
      },
    ],
  },
};

export default config;
