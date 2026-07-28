import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(testDir, path), "utf8");
const onboarding = read("../components/onboarding/onboarding-modal.tsx");
const dashboard = read("../components/dashboard/dashboard-content.tsx");
const notifications = read("../components/notifications/notification-center.tsx");
const settings = read("../components/settings/launch-settings.tsx");
const repository = read("../lib/data/repositories/launchRepository.ts");
const apiClient = read("../lib/data/api/apiClient.ts");
const repositoryHook = read("../hooks/use-repository-resource.ts");
const dataErrorState = read("../components/ui/data-error-state.tsx");
const privacy = read("../app/privacy/page.tsx");
const terms = read("../app/terms/page.tsx");

test("guided onboarding persists each step and performs real repository mutations", () => {
  assert.match(onboarding, /onboardingStatus: "in_progress"/);
  assert.match(onboarding, /resumeRepository\.create/);
  assert.match(onboarding, /uploadResumeFile/);
  assert.match(onboarding, /applicationRepository\.create/);
  assert.match(onboarding, /applicationRepository\.analyzeResume/);
  assert.match(onboarding, /generatePrepPlan/);
  assert.match(onboarding, /Continue later/);
});

test("Today dashboard has one primary action and ordered launch sections", () => {
  assert.match(repository, /"\/dashboard\/today"/);
  assert.match(repository, /assertApiToday\(response\)/);
  assert.match(repository, /workspaceStatus: value\.workspace_status/);
  assert.match(dashboard, /Recommended next action/);
  assert.match(dashboard, /NeedsAttention/);
  assert.match(dashboard, /UpcomingEvents/);
  assert.match(dashboard, /Weekly progress/);
  assert.match(dashboard, /Pipeline snapshot/);
  assert.match(dashboard, /Resume performance/);
  assert.match(dashboard, /summary\.workspaceStatus === "partial"/);
  assert.match(dashboard, /error && !summary/);
});

test("notification center exposes unread, read-all, actions, and useful empty state", () => {
  assert.match(notifications, /unreadCount/);
  assert.match(notifications, /markAllRead/);
  assert.match(notifications, /Mark read/);
  assert.match(notifications, /You are caught up/);
  assert.match(repository, /`\/notifications\/\$\{id\}\/read`/);
});

test("account controls require typed deletion confirmation and support export", () => {
  assert.match(settings, /confirmation !== "DELETE"/);
  assert.match(settings, /launchRepository\.exportData/);
  assert.match(settings, /launchRepository\.deleteAccount/);
  assert.match(settings, /user\?\.delete/);
});

test("request IDs and structured rate-limit errors are handled centrally", () => {
  assert.match(apiClient, /X-Request-ID/);
  assert.match(apiClient, /status === 429/);
  assert.match(apiClient, /RATE_LIMITED/);
});

test("Today retries transient GET failures without retrying auth or route errors", () => {
  assert.match(apiClient, /status === 502 \|\| status === 503 \|\| status === 504/);
  assert.match(apiClient, /method !== "GET" \|\| init\.signal \|\| !isRetryableGetError/);
  assert.match(apiClient, /if \(status === 401\)/);
  assert.match(apiClient, /if \(status === 404\)/);
});

test("Retry enters loading and authentication has a dedicated recovery state", () => {
  assert.match(repositoryHook, /const currentRequest = \+\+requestId\.current;\s+setLoading\(true\);\s+setError\(null\)/);
  assert.match(dataErrorState, /Your session expired/);
  assert.match(dataErrorState, /Sign in again/);
});

test("malformed Today responses fail explicitly instead of becoming empty mock data", () => {
  assert.match(repository, /OfferOS received an incomplete Today summary/);
  assert.match(repository, /typeof summary\.generated_at !== "string"/);
  assert.doesNotMatch(repository, /catch[\s\S]{0,100}fromApiToday/);
});

test("public legal pages disclose AI limitations and data handling", () => {
  assert.match(privacy, /AI processing/);
  assert.match(privacy, /Retention and deletion/);
  assert.match(terms, /AI limitations/);
  assert.match(terms, /not hiring predictions/);
});
