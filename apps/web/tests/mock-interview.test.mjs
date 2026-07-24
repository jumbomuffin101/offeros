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
let stored = [];
const { mockInterviewRepository } = loadTsModule(
  "../lib/data/repositories/mockInterviewRepository.ts",
  {
    "@/lib/data/storage/local/mockInterviewStorage": {
      readMockInterviews: () => structuredClone(stored),
      writeMockInterviews: (value) => { stored = structuredClone(value); },
    },
    "@/lib/data/repositories/applicationRepository": {
      applicationRepository: {
        get: async () => ({
          id: "application-1",
          company: "Acme",
          role: "Backend Engineer",
          jobDescription: "Build APIs.",
        }),
      },
    },
    "@/lib/data/repositories/resumeRepository": {
      resumeRepository: {
        get: async () => ({
          id: "resume-1",
          name: "Backend Resume",
          targetRole: "Backend Engineer",
        }),
      },
    },
  },
);
const apiRepository = readFileSync(
  join(testDir, "../lib/data/repositories/apiMockInterviewRepository.ts"),
  "utf8",
);
const workspace = readFileSync(
  join(testDir, "../components/prep/mock-interview-workspace.tsx"),
  "utf8",
);
const active = readFileSync(
  join(testDir, "../components/prep/active-mock-interview.tsx"),
  "utf8",
);
const scorecard = readFileSync(
  join(testDir, "../components/prep/mock-interview-scorecard.tsx"),
  "utf8",
);
const prepWorkspace = readFileSync(
  join(testDir, "../components/prep/prep-workspace.tsx"),
  "utf8",
);
const applicationDrawer = readFileSync(
  join(testDir, "../components/applications/application-detail-drawer.tsx"),
  "utf8",
);

test("local mode creates, resumes, evaluates, and completes a persisted interview", async () => {
  stored = [];
  const created = await mockInterviewRepository.create({
    applicationId: "application-1",
    resumeVersionId: "resume-1",
    interviewType: "mixed",
    difficulty: "standard",
    questionCount: 3,
  });
  assert.equal(created.session.status, "active");
  assert.equal(created.session.companyName, "Acme");
  assert.equal(created.firstTurn.speaker, "interviewer");

  let result;
  for (let index = 0; index < 9; index += 1) {
    result = await mockInterviewRepository.answer(
      created.session.id,
      `Answer ${index} with a specific decision.`,
      `answer-${index}`,
    );
  }
  assert.equal(result.session.status, "completed");
  assert.ok(result.session.scorecard);
  assert.equal((await mockInterviewRepository.get(created.session.id)).status, "completed");
});

test("local answer idempotency does not create duplicate turns", async () => {
  stored = [];
  const created = await mockInterviewRepository.create({
    interviewType: "technical",
    difficulty: "standard",
    questionCount: 3,
  });
  const first = await mockInterviewRepository.answer(
    created.session.id,
    "I would inspect traces and compare dependency latency before changing code.",
    "same-id",
  );
  const duplicate = await mockInterviewRepository.answer(
    created.session.id,
    "Different body with duplicate request id.",
    "same-id",
  );
  assert.equal(duplicate.session.turns.length, first.session.turns.length);
});

test("API repository uses authenticated mock interview endpoints and long timeout", () => {
  assert.match(apiRepository, /"\/mock-interviews"/);
  assert.match(apiRepository, /`\/mock-interviews\/\$\{id\}\/answer`/);
  assert.match(apiRepository, /answer_request_id: answerRequestId/);
  assert.match(apiRepository, /MOCK_INTERVIEW_TIMEOUT_MS/);
  assert.match(apiRepository, /application_id: input\.applicationId \?\? null/);
  assert.match(apiRepository, /resume_version_id: input\.resumeVersionId \?\? null/);
});

test("Prep exposes configuration, resumable active experience, feedback, and results", () => {
  assert.match(prepWorkspace, />Mock interviews</);
  assert.match(workspace, /beforeunload/);
  assert.match(workspace, /openSession/);
  assert.match(workspace, /crypto\.randomUUID/);
  assert.match(active, /Submit answer/);
  assert.match(active, /Feedback on your previous answer/);
  assert.match(active, /End and mark this session abandoned/);
  assert.match(scorecard, /AI-generated practice assessment/);
  assert.match(scorecard, /Question-by-question review/);
  assert.match(scorecard, /Save next action to Prep/);
});

test("application workspace prefills mock interview launch context", () => {
  assert.match(applicationDrawer, /Practice for this role/);
  assert.match(applicationDrawer, /tab=mock-interviews&application=/);
  assert.match(applicationDrawer, /&resume=\$\{selectedResume\.id\}/);
});

test("active interview remains responsive at narrow and wide layouts", () => {
  assert.match(active, /sm:flex-row/);
  assert.match(active, /max-w-4xl/);
  assert.match(scorecard, /sm:grid-cols-2/);
  assert.match(scorecard, /lg:grid-cols-3/);
});

function loadTsModule(relativePath, mocks = {}) {
  const filename = join(testDir, relativePath);
  const source = readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
    fileName: filename,
  }).outputText;
  const loadedModule = { exports: {} };
  const localRequire = (specifier) => mocks[specifier] ?? require(specifier);
  vm.runInNewContext(
    `(function (exports, require, module, __filename, __dirname) { ${output}\n})`,
    { structuredClone, console, Date, Math, Set },
    { filename },
  )(
    loadedModule.exports,
    localRequire,
    loadedModule,
    filename,
    dirname(filename),
  );
  return loadedModule.exports;
}
