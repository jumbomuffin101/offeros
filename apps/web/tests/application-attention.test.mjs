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
const { buildLocalInbox, signalKey } = loadTsModule(
  "../lib/application-attention-utils.ts",
  { "@/lib/types": {} },
);
const attentionCard = readFileSync(
  join(testDir, "../components/inbox/attention-item-card.tsx"),
  "utf8",
);
const inboxWorkspace = readFileSync(
  join(testDir, "../components/inbox/inbox-workspace.tsx"),
  "utf8",
);
const needsAttention = readFileSync(
  join(testDir, "../components/dashboard/needs-attention.tsx"),
  "utf8",
);

const now = new Date("2026-07-23T12:00:00.000Z");
const emptyPrep = {
  codingProblems: [],
  behavioralQuestions: [],
  systemDesignPrompts: [],
};

test("local inbox applies follow-up thresholds and urgency ordering", () => {
  const oldApplied = application({
    id: "old",
    dateApplied: "2026-07-11",
    meaningfulUpdatedAt: "2026-07-11T12:00:00.000Z",
  });
  const recentApplied = application({
    id: "recent",
    company: "Recent",
    dateApplied: "2026-07-18",
    meaningfulUpdatedAt: "2026-07-18T12:00:00.000Z",
  });
  const deadline = application({
    id: "deadline",
    company: "Deadline",
    status: "OA",
    dateApplied: "2026-07-20",
    meaningfulUpdatedAt: "2026-07-20T12:00:00.000Z",
  });
  const events = [
    event({
      id: "oa",
      applicationId: "deadline",
      eventType: "oa_deadline",
      title: "Online assessment",
      scheduledAt: "2026-07-24T06:00:00.000Z",
    }),
  ];

  const inbox = buildLocalInbox(
    [oldApplied, recentApplied, deadline],
    events,
    emptyPrep,
    [],
    now,
  );

  assert.equal(inbox.items[0].category, "oa_deadline_soon");
  assert.equal(inbox.items[0].priority, 90);
  assert.ok(inbox.items.some(
    (item) => item.applicationId === "old" && item.category === "follow_up_due",
  ));
  assert.ok(!inbox.items.some(
    (item) => item.applicationId === "recent" && item.category === "follow_up_due",
  ));
});

test("matching snooze and dismiss overrides hide an item until its signal changes", () => {
  const applied = application({
    id: "follow-up",
    dateApplied: "2026-07-01",
    meaningfulUpdatedAt: "2026-07-01T12:00:00.000Z",
  });
  const original = buildLocalInbox([applied], [], emptyPrep, [], now);
  const item = original.items.find(
    (candidate) => candidate.category === "follow_up_due",
  );
  assert.ok(item);

  const dismissed = buildLocalInbox(
    [applied],
    [],
    emptyPrep,
    [{
      applicationId: applied.id,
      category: item.category,
      signalKey: signalKey(item),
      dismissedUntil: null,
    }],
    now,
  );
  assert.ok(!dismissed.items.some(
    (candidate) => candidate.category === "follow_up_due",
  ));

  const expired = buildLocalInbox(
    [applied],
    [],
    emptyPrep,
    [{
      applicationId: applied.id,
      category: item.category,
      signalKey: signalKey(item),
      dismissedUntil: "2026-07-22T12:00:00.000Z",
    }],
    now,
  );
  assert.ok(expired.items.some(
    (candidate) => candidate.category === "follow_up_due",
  ));
});

test("inbox exposes one-click actions, snooze, dismiss, and copilot follow-up", () => {
  assert.match(attentionCard, /copilot=follow-up/);
  assert.match(attentionCard, />Dismiss</);
  assert.match(attentionCard, />Snooze</);
  assert.match(attentionCard, />Tomorrow</);
  assert.match(attentionCard, />3 days</);
  assert.match(attentionCard, />1 week</);
  assert.match(inboxWorkspace, /onDismiss/);
  assert.match(inboxWorkspace, /onSnooze/);
});

test("dashboard uses shared inbox items", () => {
  assert.match(needsAttention, /AttentionItemCard/);
  assert.match(needsAttention, /items\.slice\(0, 5\)/);
});

function application(overrides = {}) {
  return {
    id: "application",
    company: "Acme",
    role: "Software Engineer",
    status: "Applied",
    dateApplied: "",
    jobDescription: "Build reliable software.",
    resumeVersionId: "resume",
    resumeAnalysisId: "analysis",
    createdAt: "2026-07-01T12:00:00.000Z",
    updatedAt: "2026-07-01T12:00:00.000Z",
    meaningfulUpdatedAt: "2026-07-01T12:00:00.000Z",
    ...overrides,
  };
}

function event(overrides = {}) {
  return {
    id: "event",
    applicationId: "application",
    eventType: "technical_interview",
    title: "Technical interview",
    scheduledAt: "2026-07-25T12:00:00.000Z",
    status: "upcoming",
    completedAt: "",
    ...overrides,
  };
}

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
    {},
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
