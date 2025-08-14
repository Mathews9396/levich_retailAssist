import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "node",
  collectCoverage: true,
  detectOpenHandles: true,
  resetMocks: true,
  clearMocks: true,
  forceExit: false,
  coverageReporters: ["json", "html", "lcov", "text-summary", "json-summary"],
  coverageDirectory: "./coverage",
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup-db.ts"],

  // testSequencer: "./test/jest-files-sequencer.js",
  // setupFiles: ["<rootDir>/__tests__/setup-env.ts"],
  // setupFilesAfterEnv: ["<rootDir>/__tests__/setup-db.ts"],
  rootDir: ".",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/src/$1",
    "^@app$": "<rootDir>/src/app",
    "^@services/(.*)$": "<rootDir>/src/services/$1",
    "^@constants$": "<rootDir>/src/constants/index",
    "^@generated/(.*)$": "<rootDir>/generated/$1",
    "^@utils/(.*)$": "<rootDir>/src/utils/$1",
  },
  testPathIgnorePatterns: [
    "/node_modules/",
    "/__tests__/setup-db.ts",
    "\\.skip\\.ts$", // ignore files ending in .skip.ts
  ],
};
export default config;
