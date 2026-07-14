import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import ts from "typescript";
import vm from "node:vm";

const testDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const source = readFileSync(join(testDir, "../lib/resume-error-state.ts"), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
}).outputText;

const testModule = { exports: {} };
vm.runInNewContext(compiled, { exports: testModule.exports, module: testModule, require }, { filename: "resume-error-state.ts" });

const { shouldShowResumeFatalError } = testModule.exports;
const timeoutError = { code: "NETWORK_ERROR", message: "Your cloud workspace took longer than expected." };

test("completed analysis and timeout banner cannot render simultaneously", () => {
  assert.equal(shouldShowResumeFatalError({
    error: timeoutError,
    resumeCount: 1,
    selectedResumeId: "resume_1",
    latestAnalysisStatus: "completed",
  }), false);
});

test("selected resume suppresses stale workspace timeout banner", () => {
  assert.equal(shouldShowResumeFatalError({
    error: timeoutError,
    resumeCount: 1,
    selectedResumeId: "resume_1",
    latestAnalysisStatus: null,
  }), false);
});

test("initial load failure can still render fatal state when no data exists", () => {
  assert.equal(shouldShowResumeFatalError({
    error: timeoutError,
    resumeCount: 0,
    selectedResumeId: null,
    latestAnalysisStatus: null,
  }), true);
});
