import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("Behavioral Coach exposes story readiness, competencies, trend, and portfolio coverage", async () => {
  const card = await read("components/prep/behavioral-practice-card.tsx");
  assert.match(card, /Behavioral Coach/);
  assert.match(card, /interview-ready/);
  assert.match(card, /competencies covered/);
  assert.match(card, /question\.trendSummary/);
  assert.match(card, /Missing:/);
});

test("story detail includes deterministic STAR checks and controlled competency tags", async () => {
  const drawer = await read("components/prep/behavioral-answer-drawer.tsx");
  const coach = await read("lib/behavioral-coach.ts");
  assert.match(drawer, /STAR completeness/);
  assert.match(drawer, /Deterministic checks run before any AI evaluation/);
  assert.match(drawer, /behavioralCompetencies\.map/);
  assert.match(coach, /customer_focus/);
  assert.match(coach, /unclear_ownership/);
  assert.match(coach, /no_quantification/);
});

test("evaluation and comparison state remain digestible", async () => {
  const drawer = await read("components/prep/behavioral-answer-drawer.tsx");
  assert.match(drawer, /Evaluate story/);
  assert.match(drawer, /Recurring strengths/);
  assert.match(drawer, /Recurring weaknesses/);
  assert.match(drawer, /Recommended revisions/);
  assert.match(drawer, /Comparison:/);
  assert.match(drawer, /Evaluation history/);
});

test("focused practice supports competency prompt, answer, and evaluation", async () => {
  const drawer = await read("components/prep/behavioral-answer-drawer.tsx");
  const api = await read("lib/data/repositories/apiPrepRepository.ts");
  assert.match(drawer, /Focused practice/);
  assert.match(drawer, /Evaluate practice answer/);
  assert.match(api, /\/prep\/behavioral-practice/);
  assert.match(api, /timeoutMs: 300000/);
});

test("application prep links shared stories into Behavioral Coach", async () => {
  const drawer = await read("components/applications/application-detail-drawer.tsx");
  assert.match(drawer, /recommended_story_ids/);
  assert.match(drawer, /missing_story_categories/);
  assert.match(drawer, /Practice now/);
  assert.match(drawer, /\/prep\?tab=behavioral&application=/);
});

test("API mode uses user-scoped coach endpoints and maps snake case once", async () => {
  const api = await read("lib/data/repositories/apiPrepRepository.ts");
  const mapper = await read("lib/data/api/mappers.ts");
  assert.match(api, /`\/prep\/behavioral\/\$\{storyId\}\/evaluate`/);
  assert.match(api, /`\/prep\/behavioral\/\$\{storyId\}\/evaluations`/);
  assert.match(api, /\/prep\/behavioral-portfolio/);
  assert.match(mapper, /latest_evaluation_json/);
  assert.match(mapper, /readiness_status/);
});

test("local mode labels simulated evaluation and persists practice history", async () => {
  const local = await read("lib/data/repositories/prepRepository.ts");
  const drawer = await read("components/prep/behavioral-answer-drawer.tsx");
  assert.match(local, /simulated-rules-v1/);
  assert.match(local, /offeros\.behavioral-evaluations\.v1/);
  assert.match(local, /offeros\.behavioral-practice\.v1/);
  assert.match(drawer, /Simulated deterministic guidance/);
});

test("Behavioral Coach is responsive and does not alter other Prep workspaces", async () => {
  const drawer = await read("components/prep/behavioral-answer-drawer.tsx");
  const workspace = await read("components/prep/prep-workspace.tsx");
  assert.match(drawer, /w-full max-w-3xl/);
  assert.match(drawer, /grid-cols-2 gap-2 sm:grid-cols-3/);
  assert.match(workspace, /MockInterviewWorkspace/);
  assert.match(workspace, /SystemDesignCard/);
  assert.match(workspace, /CodingIntelligencePanel/);
});
