import type { BehavioralComparison, BehavioralEvaluation, BehavioralEvaluationResult, BehavioralPortfolio, BehavioralQuestion, BehavioralStarCompleteness } from "@/lib/types";

export const behavioralCompetencies = ["ownership", "leadership", "conflict", "failure", "ambiguity", "collaboration", "communication", "customer_focus", "initiative", "adaptability", "prioritization", "influence", "learning", "resilience", "impact", "ethics"] as const;
export const competencyLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

export function localStarCompleteness(story: BehavioralQuestion, answer?: string): BehavioralStarCompleteness {
  const sections = { situation: Boolean(story.starSituation.trim()), task: Boolean(story.starTask.trim()), action: Boolean(story.starAction.trim()), result: Boolean(story.starResult.trim()) };
  const text = answer || [story.starSituation, story.starTask, story.starAction, story.starResult].join(" ");
  const lower = text.toLowerCase(); const signals: string[] = [];
  if (!sections.result) signals.push("missing_result");
  if (story.starAction.trim().split(/\s+/).length < 18) signals.push("weak_action");
  if (!/\b(i|my|me)\b/.test(lower)) signals.push("unclear_ownership");
  if (!/\d/.test(text)) signals.push("no_quantification");
  if (!/\b(learned|next time|takeaway|would)\b/.test(lower)) signals.push("insufficient_reflection");
  if (story.starSituation.split(/\s+/).length > 140) signals.push("too_much_context");
  return { score: Math.max(0, Math.min(100, Object.values(sections).filter(Boolean).length * 18 + (!signals.includes("unclear_ownership") ? 10 : 0) + (!signals.includes("no_quantification") ? 8 : 0) + (!signals.includes("insufficient_reflection") ? 10 : 0))), sections, signals, wordCount: text.trim().split(/\s+/).filter(Boolean).length, schemaVersion: "star-completeness-v1" };
}

export function localBehavioralEvaluation(story: BehavioralQuestion, competencyFocus?: string, answer?: string): BehavioralEvaluationResult {
  const completeness = localStarCompleteness(story, answer); const text = answer || [story.starSituation, story.starTask, story.starAction, story.starResult].join(" "); const lower = text.toLowerCase();
  const ownership = /\b(i|my|me)\b/.test(lower); const quantified = /\d/.test(text); const reflection = /\b(learned|next time|takeaway|would)\b/.test(lower); const base = Math.max(1, Math.min(5, Math.round(completeness.score / 20)));
  return { competencies: [competencyFocus, ...(story.competencyTags ?? [])].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index), starScores: { situation: base, task: base, action: Math.min(5, base + (ownership ? 1 : 0)), result: Math.min(5, base + (quantified ? 1 : 0)), reflection: Math.min(5, base + (reflection ? 1 : 0)) }, qualityScores: { clarity: text.split(/\s+/).length < 450 ? 4 : 2, specificity: text.split(/\s+/).length >= 60 ? 4 : 2, ownership: ownership ? 5 : 2, impact: quantified ? 5 : 2, conciseness: text.split(/\s+/).length < 450 ? 4 : 2, authenticity: 4 }, strengths: [ownership ? "Personal contribution is explicit." : "The story provides a usable foundation."], weaknesses: [!ownership ? "Personal ownership is unclear." : "", !quantified ? "The result lacks quantified impact where relevant." : "", !reflection ? "The story needs a clearer reflection or learning." : ""].filter(Boolean), missingElements: completeness.signals, recommendedRevision: completeness.signals.map((signal) => ({ missing_result: "Add a concrete outcome and what changed.", unclear_ownership: "Separate your contribution from the team's work.", no_quantification: "Add a real metric if one is available; do not invent one.", insufficient_reflection: "Add what you learned and what you would change." })[signal] || "Add one specific supporting detail."), observationCandidates: [] };
}

export function localPortfolio(stories: BehavioralQuestion[]): BehavioralPortfolio {
  const covered = [...new Set(stories.flatMap((story) => story.competencyTags ?? []))]; const evaluated = stories.filter((story) => story.latestEvaluatedAt); const missing = behavioralCompetencies.filter((item) => !covered.includes(item));
  return { totalStories: stories.length, evaluatedStories: evaluated.length, interviewReadyStories: stories.filter((story) => story.readinessStatus === "interview_ready").length, competenciesCovered: covered, missingCompetencies: missing, overusedStoryIds: stories.filter((story) => (story.competencyTags?.length ?? 0) > 4).map((story) => story.id), storiesNeedingWork: stories.filter((story) => !story.readinessStatus || ["draft", "needs_work"].includes(story.readinessStatus)).map((story) => story.id), strongestStoryId: evaluated[0]?.id ?? null, weakestStoryId: evaluated.at(-1)?.id ?? null, topNextAction: missing.length ? `Add a ${competencyLabel(missing[0]).toLowerCase()} story.` : evaluated.length ? "Practice the story that needs the most work." : "Evaluate a saved story.", dataSufficiency: stories.length < 2 ? "insufficient" : evaluated.length < 3 ? "partial" : "sufficient" };
}

export function localComparison(prior: BehavioralEvaluation | undefined, current: BehavioralEvaluationResult, focus?: string): BehavioralComparison {
  if (!prior) return { priorEvaluationId: null, status: "not_comparable", dataSufficiency: "insufficient", scoreDeltas: {}, improvedAreas: [], declinedAreas: [], unchangedAreas: [] };
  const status = prior.competencyFocus === (focus || null) ? "comparable" : "partially_comparable"; const scoreDeltas = Object.fromEntries(Object.entries(current.qualityScores).map(([key, value]) => [key, value - (prior.evaluation.qualityScores[key as keyof typeof current.qualityScores] ?? value)]));
  return { priorEvaluationId: prior.id, status, dataSufficiency: status === "comparable" ? "sufficient" : "partial", scoreDeltas, improvedAreas: Object.keys(scoreDeltas).filter((key) => scoreDeltas[key] > 0), declinedAreas: Object.keys(scoreDeltas).filter((key) => scoreDeltas[key] < 0), unchangedAreas: Object.keys(scoreDeltas).filter((key) => scoreDeltas[key] === 0) };
}
