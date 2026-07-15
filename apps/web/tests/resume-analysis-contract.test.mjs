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
  RESUME_ANALYSIS_MISSING_JOB_DESCRIPTION_ERROR,
  RESUME_ANALYSIS_MISSING_RESUME_ERROR,
  RESUME_ANALYSIS_MISSING_RESUME_TEXT_ERROR,
  RESUME_ANALYSIS_INVALID_RESPONSE_ERROR,
  RESUME_ANALYSIS_START_ERROR,
  RESUME_ANALYSIS_SUMMARY_UPDATE_ERROR,
  analysisErrorMessage,
  buildResumeAnalysisRequest,
  invokeResumeAnalysis,
  mergeAnalyzedResume,
} = loadTsModule("../lib/resume-analysis-state.ts", {
  "@/lib/data/errors": { DataError },
});
const { resumeAnalyzePath } = loadTsModule("../lib/data/api/resumeAnalyzeRequest.ts");
const {
  NORMAL_API_TIMEOUT_MS,
  RESUME_ANALYSIS_TIMEOUT_MESSAGE,
  RESUME_ANALYSIS_TIMEOUT_MS,
  RESUME_UPLOAD_TIMEOUT_MS,
} = loadTsModule("../lib/data/api/request-timeouts.ts");
const { toApiResumeAnalysis } = loadTsModule("../lib/data/api/mappers.ts");

test("valid resume analysis input builds POST path and snake case payload", () => {
  const request = buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: " Backend Engineer ",
    companyName: " Acme ",
    jobDescription: " Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership. ",
    resumeText: " Built FastAPI services with PostgreSQL. ",
  });

  assert.equal(resumeAnalyzePath(request.resumeId), "/resumes/resume_1/analyze");
  assert.deepEqual(JSON.parse(JSON.stringify(toApiResumeAnalysis(request.payload))), {
    target_role: "Backend Engineer",
    company_name: "Acme",
    job_description: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
    resume_text: "Built FastAPI services with PostgreSQL.",
  });
});

test("analysis requests use a dedicated five-minute timeout", () => {
  assert.equal(RESUME_ANALYSIS_TIMEOUT_MS, 300_000);
  assert.equal(RESUME_UPLOAD_TIMEOUT_MS, 60_000);
  assert.ok(RESUME_ANALYSIS_TIMEOUT_MS > NORMAL_API_TIMEOUT_MS);
  assert.equal(RESUME_ANALYSIS_TIMEOUT_MESSAGE, "Resume analysis is taking longer than expected.");
});

test("analysis request id is mapped to the API body for idempotent retries", () => {
  const request = buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: "Backend Engineer",
    companyName: "Acme",
    jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
    resumeText: "Built FastAPI services with PostgreSQL.",
    analysisRequestId: "b2a1f0e1-863b-4a52-9906-bc8ef726ad8c",
  });

  assert.equal(toApiResumeAnalysis(request.payload).analysis_request_id, "b2a1f0e1-863b-4a52-9906-bc8ef726ad8c");
});

test("missing resume id does not crash before request", () => {
  assert.throws(
    () => buildResumeAnalysisRequest({
      resume: {},
      targetRole: "Backend Engineer",
      companyName: "",
      jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
      resumeText: "Built FastAPI services.",
    }),
    (error) => error.message === RESUME_ANALYSIS_MISSING_RESUME_ERROR,
  );
});

test("missing job description shows validation before request", () => {
  assert.throws(
    () => buildResumeAnalysisRequest({
      resume: { id: "resume_1" },
      targetRole: "Backend Engineer",
      companyName: "",
      jobDescription: "",
      resumeText: "Built FastAPI services.",
    }),
    (error) => error.message === RESUME_ANALYSIS_MISSING_JOB_DESCRIPTION_ERROR,
  );
});

test("missing resume text shows validation before request", () => {
  assert.throws(
    () => buildResumeAnalysisRequest({
      resume: { id: "resume_1" },
      targetRole: "Backend Engineer",
      companyName: "",
      jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
      resumeText: undefined,
    }),
    (error) => error.message === RESUME_ANALYSIS_MISSING_RESUME_TEXT_ERROR,
  );
});

test("valid input invokes the analysis repository with the resume id and payload", async () => {
  const request = buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: "Backend Engineer",
    companyName: "Acme",
    jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
    resumeText: "Built FastAPI services with PostgreSQL.",
  });
  const calls = [];
  const response = await invokeResumeAnalysis(async (resumeId, payload) => {
    calls.push({ resumeId, payload });
    return { analysis: { id: "analysis_1" }, resume: { id: "resume_1" } };
  }, request);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].resumeId, "resume_1");
  assert.equal(calls[0].payload.targetRole, "Backend Engineer");
  assert.equal(response.analysis.id, "analysis_1");
});

test("invalid input never invokes the analysis repository", () => {
  let called = false;
  assert.throws(() => buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: "Backend Engineer",
    companyName: "",
    jobDescription: "",
    resumeText: "Built FastAPI services.",
  }));
  assert.equal(called, false);
});

test("response validation occurs after the repository resolves", async () => {
  let resolveRepository;
  let invoked = false;
  const request = buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: "Backend Engineer",
    companyName: "",
    jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
    resumeText: "Built FastAPI services.",
  });
  const pending = invokeResumeAnalysis(() => {
    invoked = true;
    return new Promise((resolve) => { resolveRepository = resolve; });
  }, request);

  assert.equal(invoked, true);
  resolveRepository({ analysis: { id: "analysis_1" }, resume: { id: "resume_1" } });
  const response = await pending;
  assert.equal(response.resume.id, "resume_1");
});

test("malformed repository response is a friendly response error", async () => {
  const request = buildResumeAnalysisRequest({
    resume: { id: "resume_1" },
    targetRole: "Backend Engineer",
    companyName: "",
    jobDescription: "Backend engineer role requiring Python, FastAPI, PostgreSQL, testing, reliable services, Docker, APIs, and ownership.",
    resumeText: "Built FastAPI services.",
  });
  await assert.rejects(
    () => invokeResumeAnalysis(async () => ({ resume: { id: "resume_1" } }), request),
    (error) => error instanceof DataError && error.message === RESUME_ANALYSIS_INVALID_RESPONSE_ERROR,
  );
});

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

  assert.equal(message, RESUME_ANALYSIS_INVALID_RESPONSE_ERROR);
});

test("a frontend TypeError is not shown raw", () => {
  assert.equal(analysisErrorMessage(new TypeError("onAnalyze is not a function")), RESUME_ANALYSIS_START_ERROR);
  assert.notEqual(RESUME_ANALYSIS_START_ERROR, "onAnalyze is not a function");
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
