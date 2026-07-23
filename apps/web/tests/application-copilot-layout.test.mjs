import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const drawer = readFileSync(join(testDir, "../components/applications/application-detail-drawer.tsx"), "utf8");
const form = readFileSync(join(testDir, "../components/applications/application-workspace-form.tsx"), "utf8");
const copilot = readFileSync(join(testDir, "../components/applications/application-copilot.tsx"), "utf8");
const apiRepository = readFileSync(join(testDir, "../lib/data/repositories/apiApplicationCopilotRepository.ts"), "utf8");
const board = readFileSync(join(testDir, "../components/applications/application-board.tsx"), "utf8");

test("application workspace uses available width and responsive two-column layout", () => {
  assert.match(drawer, /lg:left-80/);
  assert.match(drawer, /max-w-\[1600px\]/);
  assert.match(drawer, /xl:grid-cols-\[minmax\(0,2fr\)_minmax\(340px,1fr\)\]/);
});

test("job description and notes occupy the full form width", () => {
  assert.match(form, /md:col-span-2" label="Job description"/);
  assert.match(form, /md:col-span-2" label="Notes"/);
});

test("copilot exposes quick prompts and response actions", () => {
  for (const label of ["Assess my fit", "Biggest resume gaps", "Interview prep focus", "Recruiter follow-up", "Questions to ask", "Summarize role"]) {
    assert.match(copilot, new RegExp(label));
  }
  assert.match(copilot, />Regenerate</);
  assert.match(copilot, />Clear</);
  assert.match(copilot, /navigator\.clipboard\.writeText/);
});

test("copilot repository uses the scoped endpoint and is not eagerly fetched by the application list", () => {
  assert.match(apiRepository, /`\/applications\/\$\{applicationId\}\/copilot`/);
  assert.doesNotMatch(board, /applicationCopilotRepository|\/copilot/);
});
