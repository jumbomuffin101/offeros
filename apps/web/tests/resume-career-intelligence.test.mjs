import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(root, path), "utf8");
const card = read("../components/resumes/resume-card.tsx");
const insights = read("../components/resumes/resume-insights.tsx");
const analysis = read("../components/resumes/resume-analysis-panel.tsx");
const mapper = read("../lib/data/api/mappers.ts");
const localRepository = read("../lib/data/repositories/resumeRepository.ts");

test("resume cards show longitudinal trend and honest performance sufficiency", () => {
  assert.match(card, /trendDirection/);
  assert.match(card, /No comparable prior analysis/);
  assert.match(card, /applicationPerformance\?\.status === "sufficient"/);
  assert.match(card, /Correlation only/);
  assert.match(card, /More application outcomes are needed/);
});

test("Resume Insights uses sufficient outcome evidence and recurring weakness", () => {
  assert.match(insights, /summary\.bestPerforming/);
  assert.match(insights, /summary\.recurringWeakness/);
  assert.match(insights, /more outcomes needed/);
});

test("full results retain AI disclaimer and add longitudinal sections", () => {
  assert.match(analysis, /AI-generated feedback may be incomplete or inaccurate/);
  assert.match(analysis, /Compared with prior comparable analysis/);
  assert.match(analysis, /Recurring strengths/);
  assert.match(analysis, /Recurring weaknesses/);
  assert.match(analysis, /Application-performance context/);
  assert.match(analysis, /Career Health impact/);
  assert.match(analysis, /Simulated local intelligence/);
  assert.match(analysis, /grid gap-4 xl:grid-cols-2/);
});

test("API mapping normalizes intelligence once and local mode stays simulated", () => {
  assert.match(mapper, /fromApiResumeIntelligence\(value\.intelligence_json\)/);
  assert.match(mapper, /analysisSchemaVersion: value\?\.analysis_schema_version \?\? "legacy"/);
  assert.match(localRepository, /simulated: true/);
  assert.match(localRepository, /local_deterministic/);
});
