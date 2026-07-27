import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(testDir, path), "utf8");
const workspace = read("../components/gmail/gmail-workspace.tsx");
const apiRepository = read("../lib/data/repositories/apiGmailRepository.ts");
const localRepository = read("../lib/data/repositories/gmailRepository.ts");
const factory = read("../lib/data/repositories/repositoryFactory.ts");
const drawer = read("../components/applications/application-detail-drawer.tsx");
const attentionCard = read("../components/inbox/attention-item-card.tsx");
const settings = read("../components/settings/settings-panel.tsx");
const privacy = read("../app/privacy/page.tsx");
const terms = read("../app/terms/page.tsx");

test("API mode uses the server-side Gmail integration contract", () => {
  assert.match(factory, /dataMode === "api" \? apiGmailRepository : localGmailRepository/);
  assert.match(apiRepository, /"\/integrations\/gmail\/connect"/);
  assert.match(apiRepository, /"\/integrations\/gmail\/sync"/);
  assert.match(apiRepository, /`\/integrations\/gmail\/suggestions\/\$\{id\}\/accept`/);
  assert.match(apiRepository, /application_id: input\.applicationId/);
  assert.match(apiRepository, /apply_status: input\.applyStatus/);
});

test("review UI requires explicit acceptance and supports private excerpt expansion", () => {
  assert.match(workspace, /Nothing changes until you accept a suggestion/);
  assert.match(workspace, /Show limited email excerpt/);
  assert.match(workspace, /Also change application status/);
  assert.match(workspace, /Suggestion rejected\. No application data was changed/);
  assert.match(workspace, /disabled=\{busy \|\| !applicationId \|\| !eventAt\}/);
});

test("disconnect and typed derived-data deletion preserve confirmed events", () => {
  assert.match(workspace, /Disconnect and keep review history/);
  assert.match(workspace, /DELETE GMAIL DATA/);
  assert.match(workspace, /Confirmed application timeline events were kept/);
  assert.match(apiRepository, /confirmation: "DELETE GMAIL DATA"/);
});

test("local mode is visibly simulated and can accept or reject suggestions", () => {
  assert.match(localRepository, /Simulated local data - no Gmail access/);
  assert.match(localRepository, /status: "accepted"/);
  assert.match(localRepository, /status: "rejected"/);
  assert.match(localRepository, /source: "future_email"/);
});

test("Gmail integrates with settings, application workspace, and attention actions", () => {
  assert.match(settings, /Gmail-assisted tracking/);
  assert.match(drawer, /Email activity/);
  assert.match(drawer, /Pending review/);
  assert.match(drawer, /Sync Gmail/);
  assert.match(attentionCard, /item\.category === "gmail_review"/);
  assert.match(attentionCard, /"\/integrations\/gmail"/);
});

test("public policies disclose optional read-only access and review requirements", () => {
  assert.match(privacy, /Optional Gmail access/);
  assert.match(privacy, /read-only access/);
  assert.match(terms, /Gmail-assisted tracking/);
  assert.match(terms, /must review each suggestion/);
});
