import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import vm from "node:vm";

const testDir = dirname(fileURLToPath(import.meta.url));
const { calculateNotificationPosition } = loadTsModule("../lib/notification-position.ts");
const notificationCenter = readFileSync(
  join(testDir, "../components/notifications/notification-center.tsx"),
  "utf8",
);
const sidebar = readFileSync(
  join(testDir, "../components/layout/sidebar.tsx"),
  "utf8",
);

test("sidebar bell opens to the right when viewport space is available", () => {
  const result = calculateNotificationPosition({
    trigger: { top: 600, right: 304, bottom: 636, left: 268 },
    panelHeight: 500,
    viewportWidth: 1440,
    viewportHeight: 900,
  });
  assert.equal(result.left, 312);
  assert.ok(result.top >= 12);
  assert.ok(result.top + result.maxHeight <= 900);
});

test("right-edge bell aligns the panel inward with viewport collision padding", () => {
  const result = calculateNotificationPosition({
    trigger: { top: 16, right: 1408, bottom: 52, left: 1372 },
    panelHeight: 500,
    viewportWidth: 1440,
    viewportHeight: 900,
  });
  assert.equal(result.left, 1028);
  assert.ok(result.left >= 12);
  assert.ok(result.left + result.width <= 1428);
});

test("mobile panel uses near-full width and remains inside the viewport", () => {
  const result = calculateNotificationPosition({
    trigger: { top: 12, right: 330, bottom: 48, left: 294 },
    panelHeight: 700,
    viewportWidth: 375,
    viewportHeight: 667,
  });
  assert.deepEqual(
    { left: result.left, top: result.top, width: result.width },
    { left: 12, top: 56, width: 351 },
  );
  assert.equal(result.maxHeight, 599);
});

test("notification panel is portaled, viewport-bounded, and internally scrollable", () => {
  assert.match(notificationCenter, /createPortal\(/);
  assert.match(notificationCenter, /document\.body/);
  assert.match(notificationCenter, /fixed z-\[120\]/);
  assert.match(notificationCenter, /w-\[380px\] max-w-\[calc\(100vw-1\.5rem\)\]/);
  assert.match(notificationCenter, /min-h-0 flex-1 overflow-y-auto overscroll-contain/);
  assert.doesNotMatch(notificationCenter, /sm:absolute/);
  assert.match(sidebar, /overflow-hidden/);
});

test("notification panel supports close, Escape, focus return, and focus containment", () => {
  assert.match(notificationCenter, /aria-haspopup="dialog"/);
  assert.match(notificationCenter, /data-notification-autofocus/);
  assert.match(notificationCenter, /event\.key === "Escape"/);
  assert.match(notificationCenter, /triggerRef\.current\?\.focus\(\)/);
  assert.match(notificationCenter, /event\.key !== "Tab"/);
  assert.match(notificationCenter, /aria-label="Close notifications"/);
  assert.match(notificationCenter, /You are caught up/);
});

function loadTsModule(relativePath) {
  const require = createRequire(import.meta.url);
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
  vm.runInNewContext(
    `(function (exports, require, module, __filename, __dirname) { ${output}\n})`,
    {},
    { filename },
  )(
    loadedModule.exports,
    require,
    loadedModule,
    filename,
    dirname(filename),
  );
  return loadedModule.exports;
}
