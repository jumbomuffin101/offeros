import test from "node:test";
import assert from "node:assert/strict";
import { jsonLdJob, cleanText } from "../extract.js";
import { extractJob } from "../adapters.js";
import { captureState, normalizeApiResponse } from "../api-response.js";

global.location = { href: "https://boards.greenhouse.io/acme/jobs/123" };
const node = (textContent = "", content = "") => ({ textContent, content });
function documentStub(values = {}, jsonLd = []) { return { title: values.title || "", querySelector: (selector) => values[selector] || null, querySelectorAll: (selector) => selector.includes("ld+json") ? jsonLd : [] }; }

test("JSON-LD JobPosting is preferred and sanitized", () => { const document = documentStub({}, [node(JSON.stringify({ "@type": "JobPosting", title: "Software Engineer", hiringOrganization: { name: "Acme" }, jobLocation: { address: { addressLocality: "New York" } }, description: "<p>Build &amp; ship</p>", identifier: { value: "123" } }))]); const job = jsonLdJob(document); assert.equal(job.company, "Acme"); assert.equal(job.role, "Software Engineer"); assert.equal(job.description, "Build & ship"); });
test("Greenhouse adapter extracts active page fields", () => { const document = documentStub({ "h1": node("Backend Engineer"), ".company-name": node("Acme"), ".location": node("Remote"), "main": node("Build APIs") }); const job = extractJob(document, location.href); assert.equal(job.source, "greenhouse"); assert.equal(job.company, "Acme"); assert.equal(job.role, "Backend Engineer"); });
test("Lever and Ashby adapters identify supported hosts", () => { const lever = extractJob(documentStub({ ".posting-headline h2": node("SWE"), ".posting-categories .location": node("NY") }), "https://jobs.lever.co/acme/abc"); const ashby = extractJob(documentStub({ "h1": node("Platform Engineer") }), "https://jobs.ashbyhq.com/acme/abc"); assert.equal(lever.source, "lever"); assert.equal(ashby.source, "ashby"); });
test("description cleaning strips executable markup", () => { assert.equal(cleanText("<script>bad()</script><style>x{}</style><p>Hello&nbsp;world</p>"), "Hello world"); });
test("missing optional job fields fall back safely", () => { const job = extractJob(documentStub({ title: "Developer" }), "https://example.com/jobs/123"); assert.equal(job.role, "Developer"); assert.equal(job.company, ""); assert.equal(job.source, "other"); });
test("capture responses distinguish save and duplicate states", () => { assert.equal(captureState(normalizeApiResponse(200, { status: "created", application: { id: "app-1" } })), "created"); assert.equal(captureState(normalizeApiResponse(200, { status: "duplicate", application: { id: "app-1" } })), "duplicate"); });
test("authentication failures return a safe extension error", () => { const response = normalizeApiResponse(401, { error: { message: "Session expired." } }); assert.equal(response.ok, false); assert.equal(response.error, "Session expired."); });
