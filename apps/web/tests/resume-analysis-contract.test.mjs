import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import vm from "node:vm";

const testDir = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

class DataError extends Error {
  constructor(code, message, options) {
    super(message);
    this.name = "DataError";
    this.code = code;
    this.cause = options?.cause;
  }
}

const { parseAnalyzeData } = loadTsModule("../lib/data/api/resumeAnalyzeResponse.ts", {
  "@/lib/data/errors": { DataError },
});
const {
  RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR,
  analysisErrorMessage,
  mergeAnalyzedResume,
} = loadTsModule("../lib/resume-analysis-state.ts");

test("valid analyze response exposes analysis and resume", () => {
  const parsed = parseAnalyzeData({ data: { analysis: { id: "analysis_1" }, resume: { id: "resume_1" } } });

  assert.equal(parsed.analysis.id, "analysis_1");
  assert.equal(parsed.resume.id, "resume_1");
});

test("missing analysis object throws a typed response error", () => {
  assert.throws(
    () => parseAnalyzeData({ data: { resume: { id: "resume_1" } } }),
    (error) => error instanceof DataError && error.code === "API_ERROR",
  );
});

test("missing resume object preserves the analysis as a partial success", () => {
  const parsed = parseAnalyzeData({ data: { analysis: { id: "analysis_1" } } });

  assert.equal(parsed.analysis.id, "analysis_1");
  assert.equal(parsed.resume, null);
});

test("malformed analyze response throws a typed response error", () => {
  assert.throws(
    () => parseAnalyzeData(null),
    (error) => error instanceof DataError && error.code === "API_ERROR",
  );
});

test("successful response updates the matching resume cache entry", () => {
  const current = [
    { id: "resume_1", latestAnalysisId: "" },
    { id: "resume_2", latestAnalysisId: "" },
  ];
  const next = mergeAnalyzedResume(current, "resume_1", {
    analysis: { id: "analysis_1" },
    resume: { id: "resume_1", latestAnalysisId: "analysis_1" },
  });

  assert.equal(next[0].latestAnalysisId, "analysis_1");
  assert.equal(next[1].latestAnalysisId, "");
});

test("raw undefined property TypeError never reaches analysis UI", () => {
  const message = analysisErrorMessage(new TypeError("Cannot read properties of undefined (reading 'id')"));

  assert.equal(message, RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR);
});

function loadTsModule(relativePath, mocks = {}) {
  const source = readFileSync(join(testDir, relativePath), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const testModule = { exports: {} };
  const scopedRequire = (specifier) => mocks[specifier] ?? require(specifier);
  vm.runInNewContext(compiled, { exports: testModule.exports, module: testModule, require: scopedRequire, TypeError }, { filename: relativePath });
  return testModule.exports;
}
