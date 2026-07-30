import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const dashboard = read("../components/dashboard/dashboard-content.tsx");
const launchRepository = read("../lib/data/repositories/launchRepository.ts");
const inboxCard = read("../components/inbox/attention-item-card.tsx");
const copilot = read("../components/applications/application-copilot.tsx");

test("Today renders ready, insufficient-data, and partial intelligence states", () => {
  assert.match(dashboard, /health\.status === "insufficient_data"/);
  assert.match(dashboard, /Insufficient data - no score assigned/);
  assert.match(dashboard, /Career Intelligence is temporarily unavailable/);
  assert.match(dashboard, /health\.overallScore/);
});

test("Today maps top priorities and compact improvement and risk signals", () => {
  assert.match(launchRepository, /career_priorities\.map/);
  assert.match(launchRepository, /improvement_signal/);
  assert.match(launchRepository, /risk_signal/);
  assert.match(dashboard, /summary\.riskSignal/);
  assert.match(dashboard, /summary\.improvementSignal/);
});

test("Smart Inbox keeps deep links and snooze-dismiss compatibility", () => {
  assert.match(inboxCard, /onDismiss/);
  assert.match(inboxCard, /onSnooze/);
  assert.match(inboxCard, /actionLink\(item\)/);
  assert.match(inboxCard, /applications\?open=/);
});

test("Recruiter Copilot frontend contract is unchanged", () => {
  assert.match(copilot, /copilot\.send\(content\)/);
  assert.match(copilot, /contextSources/);
});

test("mobile Today remains responsive and intelligence failure is non-fatal", () => {
  assert.match(dashboard, /grid gap-6 xl:grid-cols/);
  assert.match(dashboard, /if \(!health\)/);
  assert.doesNotMatch(dashboard, /if \(!health\).*DataErrorState/s);
});
