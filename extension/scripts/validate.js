import { readFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const manifest = JSON.parse(await readFile(new URL("../manifest.json", import.meta.url), "utf8"));
if (manifest.manifest_version !== 3 || !manifest.background?.service_worker || !manifest.action?.default_popup) throw new Error("Invalid extension manifest");
for (const file of ["background.js", "popup.js", "content.js", "adapters.js", "extract.js", "api-response.js"]) {
  execFileSync(process.execPath, ["--check", fileURLToPath(new URL(`../${file}`, import.meta.url))], { stdio: "inherit" });
}
console.log("Extension manifest and runtime modules validated.");
