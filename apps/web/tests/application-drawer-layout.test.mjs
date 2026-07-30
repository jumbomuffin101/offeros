import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const read = (path) => readFileSync(join(testDir, path), "utf8");
const drawer = read("../components/applications/application-detail-drawer.tsx");
const board = read("../components/applications/application-board.tsx");
const sidebar = read("../components/layout/sidebar.tsx");
const shell = read("../components/layout/app-shell.tsx");
const modalBehavior = read("../hooks/use-modal-behavior.ts");
const repositoryTypes = read("../lib/data/types/repositories.ts");
const appTypes = read("../lib/types.ts");

test("application drawer is portaled into a viewport-bound modal shell", () => {
  assert.match(drawer, /createPortal\(/);
  assert.match(drawer, /document\.body/);
  assert.match(drawer, /fixed inset-0/);
  assert.match(drawer, /100dvh/);
  assert.match(drawer, /max-h-\[calc\(100dvh-1rem\)\]/);
  assert.match(drawer, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.match(drawer, /<header className="[^"]*shrink-0/);
  assert.match(drawer, /<footer className="[^"]*shrink-0/);
});

test("application drawer preserves close, Escape, body lock, and focus containment", () => {
  assert.match(drawer, /useModalBehavior\(requestClose\)/);
  assert.match(drawer, /aria-modal="true"/);
  assert.match(drawer, /onClick=\{requestClose\}/);
  assert.match(board, /ESCAPE_EVENT/);
  assert.match(board, /setSelectedApplicationId\(null\)/);
  assert.match(modalBehavior, /document\.body\.style\.overflow = "hidden"/);
  assert.match(modalBehavior, /event\.key === "Escape"/);
  assert.match(modalBehavior, /event\.stopPropagation\(\)/);
  assert.match(modalBehavior, /event\.key !== "Tab"/);
  assert.match(modalBehavior, /previouslyFocused\?\.focus\(\)/);
});

test("sidebar has bounded navigation and no Focus widget", () => {
  assert.match(sidebar, /h-\[100dvh\]/);
  assert.match(sidebar, /min-h-0 flex-1[^"]*overflow-y-auto/);
  assert.match(sidebar, /shrink-0 space-y-3/);
  assert.match(sidebar, /<UserAccount/);
  assert.doesNotMatch(sidebar, /FocusWidget/);
  assert.doesNotMatch(sidebar, />Focus</);
  assert.doesNotMatch(repositoryTypes, /FocusItem|focus\(\)/);
  assert.doesNotMatch(appTypes, /FocusItem/);
});

test("app shell keeps natural footer flow with explicit flex boundaries", () => {
  assert.match(shell, /min-h-\[100dvh\] min-w-0/);
  assert.match(shell, /flex min-h-\[100dvh\] min-w-0 flex-1 flex-col/);
  assert.match(shell, /min-h-0 w-full max-w-7xl flex-1/);
  assert.match(shell, /<footer/);
});
