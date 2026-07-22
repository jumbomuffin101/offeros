import { cleanText, genericJob } from "./extract.js";
const text = (document, selector) => cleanText(document.querySelector(selector)?.textContent || "");
const first = (...values) => values.find(Boolean) || "";
export const adapters = [
  { source: "greenhouse", matches: (url) => url.hostname.endsWith("greenhouse.io"), extract: (d) => { const fallback = genericJob(d); return { ...fallback, company: first(text(d, ".company-name"), text(d, "#header .company-name"), fallback.company), role: first(text(d, "h1"), fallback.role), location: first(text(d, ".location"), fallback.location) }; } },
  { source: "lever", matches: (url) => url.hostname === "jobs.lever.co", extract: (d, url) => { const fallback = genericJob(d); const logo = d.querySelector(".main-header-logo img"); return { ...fallback, company: first(cleanText(logo?.alt), url.pathname.split("/")[1], fallback.company), role: first(text(d, ".posting-headline h2"), text(d, "h2"), fallback.role), location: first(text(d, ".posting-categories .location"), fallback.location) }; } },
  { source: "ashby", matches: (url) => url.hostname === "jobs.ashbyhq.com", extract: (d, url) => { const fallback = genericJob(d); return { ...fallback, company: first(fallback.company, url.pathname.split("/")[1]), role: first(text(d, "h1"), fallback.role), location: first(text(d, '[class*="location" i]'), fallback.location) }; } }
];
export function extractJob(document, urlString) { const url = new URL(urlString); const adapter = adapters.find((item) => item.matches(url)); const job = adapter ? adapter.extract(document, url) : genericJob(document); return { ...job, source: adapter?.source || "other", jobUrl: url.href }; }
