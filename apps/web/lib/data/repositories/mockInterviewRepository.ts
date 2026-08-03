import type {
  MockInterviewEvaluation,
  MockInterviewScorecard,
  MockInterviewSession,
  MockInterviewTurn,
  MockInterviewType,
} from "@/lib/types";
import type { MockInterviewRepository } from "@/lib/data/types/repositories";
import {
  readMockInterviews,
  type StoredMockInterview,
  writeMockInterviews,
} from "@/lib/data/storage/local/mockInterviewStorage";
import { applicationRepository } from "@/lib/data/repositories/applicationRepository";
import { resumeRepository } from "@/lib/data/repositories/resumeRepository";

export const mockInterviewRepository: MockInterviewRepository = {
  async list() {
    return readMockInterviews().map((session) => publicSession(session, false));
  },
  async get(id) {
    const session = readMockInterviews().find((item) => item.id === id);
    return session ? publicSession(session) : null;
  },
  async plan(input) {
    return localPlan(input);
  },
  async create(input) {
    const [application, resume] = await Promise.all([
      input.applicationId
        ? applicationRepository.get(input.applicationId)
        : Promise.resolve(null),
      input.resumeVersionId
        ? resumeRepository.get(input.resumeVersionId)
        : Promise.resolve(null),
    ]);
    const now = new Date().toISOString();
    const id = `mock-interview-${Date.now()}`;
    const targetRole = application?.role || resume?.targetRole || "Software Engineer";
    const companyName = application?.company || "";
    const plan = localPlan(input);
    const firstTurn = questionTurn(id, 0, input.interviewType, 0, now);
    const session: StoredMockInterview = {
      id,
      applicationId: application?.id,
      resumeVersionId: resume?.id,
      interviewType: input.interviewType,
      status: "active",
      difficulty: input.difficulty,
      title: companyName
        ? `${companyName} ${targetRole} practice`
        : `${targetRole} practice`,
      targetRole,
      companyName,
      questionCount: input.questionCount,
      currentQuestionIndex: 0,
      currentFollowUpCount: 0,
      contextSources: [
        ...(application ? ["Application"] : []),
        ...(application?.jobDescription ? ["Job description"] : []),
        ...(resume ? ["Resume"] : []),
      ],
      startedAt: now,
      provider: "mock",
      model: "local-deterministic",
      careerContextVersion: "local-deterministic-v1",
      questionPlan: plan.questionPlan,
      trendDelta: {},
      observationUpdates: [],
      intelligenceStatus: "ready",
      createdAt: now,
      updatedAt: now,
      turns: [firstTurn],
      processedAnswerIds: [],
    };
    writeMockInterviews([session, ...readMockInterviews()]);
    return { session: publicSession(session), firstTurn };
  },
  async answer(id, answer, answerRequestId) {
    const sessions = readMockInterviews();
    const session = sessions.find((item) => item.id === id);
    if (!session) throw new Error("Mock interview was not found.");
    if (session.status !== "active") throw new Error("This mock interview is not active.");
    if (session.processedAnswerIds.includes(answerRequestId)) {
      return resultFromSession(session);
    }
    const trimmed = answer.trim();
    if (!trimmed) throw new Error("Enter an answer before continuing.");
    const turns = session.turns ?? [];
    const currentQuestion = [...turns].reverse().find((turn) => turn.speaker === "interviewer");
    if (!currentQuestion) throw new Error("The current interview question is unavailable.");
    const evaluation = evaluateAnswer(trimmed, session.currentFollowUpCount);
    const now = new Date().toISOString();
    turns.push({
      id: `${id}-turn-${turns.length}`,
      sessionId: id,
      turnIndex: turns.length,
      speaker: "candidate",
      content: trimmed,
      questionType: currentQuestion.questionType,
      evaluation,
      createdAt: now,
    });
    session.processedAnswerIds.push(answerRequestId);
    let nextQuestion: MockInterviewTurn | undefined;
    if (evaluation.followUpNeeded && session.currentFollowUpCount < 2) {
      session.currentFollowUpCount += 1;
      nextQuestion = {
        id: `${id}-turn-${turns.length}`,
        sessionId: id,
        turnIndex: turns.length,
        speaker: "interviewer",
        content: evaluation.followUpQuestion ?? "Can you make that answer more specific?",
        questionType: currentQuestion.questionType,
        createdAt: now,
      };
      turns.push(nextQuestion);
    } else {
      session.currentQuestionIndex += 1;
      session.currentFollowUpCount = 0;
      if (session.currentQuestionIndex >= session.questionCount) {
        session.status = "completed";
        session.completedAt = now;
        session.scorecard = buildScorecard(session);
        session.overallScore = overall(session.scorecard);
        const completed = sessions.filter(
          (item) =>
            item.id !== session.id &&
            item.status === "completed" &&
            typeof item.overallScore === "number",
        );
        const baseline = completed.length
          ? Math.round(completed.slice(0, 5).reduce((sum, item) => sum + (item.overallScore ?? 0), 0) / Math.min(5, completed.length))
          : undefined;
        const delta = baseline === undefined ? undefined : session.overallScore - baseline;
        session.trendDelta = {
          direction: delta === undefined ? "insufficient_data" : delta >= 5 ? "improving" : delta <= -5 ? "declining" : "stable",
          currentScore: session.overallScore,
          recentAverage: baseline,
          delta,
          sampleSize: Math.min(5, completed.length),
          strongestDimension: strongestDimension(session.scorecard),
          weakestDimension: weakestDimension(session.scorecard),
        };
        session.observationUpdates = aggregateLocalObservations(session);
      } else {
        nextQuestion = questionTurn(
          id,
          turns.length,
          session.interviewType,
          session.currentQuestionIndex,
          now,
        );
        turns.push(nextQuestion);
      }
    }
    session.turns = turns;
    session.updatedAt = now;
    writeMockInterviews(sessions);
    return {
      session: publicSession(session),
      evaluation,
      nextQuestion,
      progress: progress(session),
    };
  },
  async abandon(id) {
    const sessions = readMockInterviews();
    const session = sessions.find((item) => item.id === id);
    if (!session) throw new Error("Mock interview was not found.");
    if (session.status === "active") {
      session.status = "abandoned";
      session.completedAt = new Date().toISOString();
      session.updatedAt = session.completedAt;
      writeMockInterviews(sessions);
    }
    return publicSession(session);
  },
};

function publicSession(
  session: StoredMockInterview,
  includeDetails = true,
): MockInterviewSession {
  const {
    currentFollowUpCount: _currentFollowUpCount,
    processedAnswerIds: _processedAnswerIds,
    ...value
  } = session;
  const result = structuredClone(value);
  result.careerContextVersion ??= "";
  result.trendDelta ??= {};
  result.observationUpdates ??= [];
  result.intelligenceStatus ??= "unavailable";
  if (!includeDetails) {
    delete result.turns;
    delete result.scorecard;
  }
  return result;
}

function evaluateAnswer(answer: string, followUpCount: number): MockInterviewEvaluation {
  const words = answer.split(/\s+/).length;
  const score = words < 20 ? 2 : words < 60 ? 3 : 4;
  const followUpNeeded = words < 35 && followUpCount < 2;
  return {
    scores: {
      accuracy: score,
      relevance: Math.min(5, score + 1),
      clarity: score,
      depth: score,
      structure: score,
    },
    strengths: words >= 20 ? ["The answer addressed the question directly."] : [],
    weaknesses: words < 60 ? ["Add specific decisions, evidence, and outcomes."] : [],
    missedPoints: words < 35 ? ["Concrete tradeoffs or measurable impact."] : [],
    followUpNeeded,
    followUpReason: followUpNeeded ? "The answer needs one more concrete example." : undefined,
    followUpQuestion: followUpNeeded
      ? followUpCount === 0
        ? "What specific action did you take, and what changed as a result?"
        : "Which tradeoff did you consider, and why did you choose that approach?"
      : undefined,
    summary: "Simulated local feedback based on answer structure and detail.",
    observationCandidates: words < 60
      ? [{ type: "interview_weakness", dimension: "depth", summary: "Answer depth needs more concrete decisions and tradeoffs.", confidence: 0.72 }]
      : [{ type: "interview_strength", dimension: "structure", summary: "The answer used a consistent, easy-to-follow structure.", confidence: 0.72 }],
  };
}

function questionTurn(
  sessionId: string,
  turnIndex: number,
  type: MockInterviewType,
  questionIndex: number,
  now: string,
): MockInterviewTurn {
  const sequence = questions(type);
  const [questionType, content] = sequence[questionIndex % sequence.length];
  return {
    id: `${sessionId}-turn-${turnIndex}`,
    sessionId,
    turnIndex,
    speaker: "interviewer",
    content,
    questionType,
    createdAt: now,
  };
}

function questions(type: MockInterviewType): Array<[MockInterviewType, string]> {
  const options: Record<Exclude<MockInterviewType, "mixed">, Array<[MockInterviewType, string]>> = {
    behavioral: [["behavioral", "Tell me about a difficult technical decision you owned and its result."]],
    resume: [["resume", "Walk me through the project on your resume that best represents your engineering judgment."]],
    technical: [["technical", "How would you debug a production API whose latency suddenly doubled?"]],
    system_design: [["system_design", "Design a reliable notification service. Start by clarifying requirements."]],
  };
  return type === "mixed"
    ? [options.behavioral[0], options.resume[0], options.technical[0], options.system_design[0]]
    : options[type];
}

function buildScorecard(session: StoredMockInterview): MockInterviewScorecard {
  const answers = (session.turns ?? []).filter((turn) => turn.speaker === "candidate");
  const evaluations = answers.flatMap((turn) => turn.evaluation ? [turn.evaluation] : []);
  const dimension = (key: keyof MockInterviewEvaluation["scores"]) => {
    const values = evaluations.flatMap((item) =>
      typeof item.scores[key] === "number" ? [item.scores[key] as number] : [],
    );
    return values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length * 20) : 0;
  };
  const lengths = answers.map((answer) => answer.content.length);
  const now = new Date().toISOString();
  const coreAverage = Math.round(
    ["clarity", "accuracy", "structure", "depth", "relevance"]
      .map((key) => dimension(key as keyof MockInterviewEvaluation["scores"]))
      .reduce((sum, value) => sum + value, 0) / 5,
  );
  return {
    id: `${session.id}-scorecard`,
    sessionId: session.id,
    communicationScore: dimension("clarity"),
    technicalAccuracyScore: dimension("accuracy"),
    structureScore: dimension("structure"),
    depthScore: dimension("depth"),
    relevanceScore: dimension("relevance"),
    behavioralScore: ["behavioral", "mixed"].includes(session.interviewType) ? coreAverage : undefined,
    resumeFluencyScore: ["resume", "mixed"].includes(session.interviewType) ? coreAverage : undefined,
    systemDesignScore: ["system_design", "mixed"].includes(session.interviewType) ? coreAverage : undefined,
    technicalReasoningScore: ["technical", "mixed"].includes(session.interviewType) ? coreAverage : undefined,
    strengths: unique(evaluations.flatMap((item) => item.strengths)).slice(0, 5),
    weaknesses: unique(evaluations.flatMap((item) => item.weaknesses)).slice(0, 5),
    missedPoints: unique(evaluations.flatMap((item) => item.missedPoints)).slice(0, 6),
    strongestAnswer: answers[lengths.indexOf(Math.max(...lengths))]?.content ?? "",
    weakestAnswer: answers[lengths.indexOf(Math.min(...lengths))]?.content ?? "",
    recommendedActions: [
      "Practice one answer with a clear context, decision, and measurable result.",
      "Review missed points before the next practice session.",
    ],
    summary: "AI-generated practice assessment simulated locally. It is not a hiring prediction.",
    createdAt: now,
    updatedAt: now,
  };
}

function overall(scorecard: MockInterviewScorecard) {
  return Math.round([
    scorecard.communicationScore,
    scorecard.technicalAccuracyScore,
    scorecard.structureScore,
    scorecard.depthScore,
    scorecard.relevanceScore,
  ].reduce((sum, score) => sum + score, 0) / 5);
}

function progress(session: StoredMockInterview) {
  return {
    completedQuestions: Math.min(session.currentQuestionIndex, session.questionCount),
    totalQuestions: session.questionCount,
    followUpCount: session.currentFollowUpCount,
  };
}

function resultFromSession(session: StoredMockInterview) {
  const answer = [...(session.turns ?? [])].reverse().find((turn) => turn.speaker === "candidate");
  const nextQuestion = (session.turns ?? []).find(
    (turn) => answer && turn.turnIndex > answer.turnIndex && turn.speaker === "interviewer",
  );
  if (!answer?.evaluation) throw new Error("The previous answer result is unavailable.");
  return {
    session: publicSession(session),
    evaluation: answer.evaluation,
    nextQuestion,
    progress: progress(session),
  };
}

function unique(values: string[]) {
  return [...new Set(values)];
}

function localPlan(input: Parameters<MockInterviewRepository["create"]>[0]) {
  const defaults = input.interviewType === "behavioral"
    ? ["structure", "measurable impact"]
    : input.interviewType === "system_design"
      ? ["system design tradeoffs", "scalability"]
      : input.interviewType === "technical"
        ? ["technical reasoning", "depth"]
        : input.interviewType === "resume"
          ? ["resume fluency", "architecture detail"]
          : ["clarity", "technical depth"];
  const selected = input.focusAreas?.length ? input.focusAreas : defaults;
  return {
    questionPlan: {
      interviewType: input.interviewType,
      difficulty: input.difficulty,
      targetDimensions: selected,
      priorityTopics: selected.map(label),
      avoidRecentRepetition: [],
      recurringWeaknesses: [],
      validatedStrengths: [],
      applicationSpecificTopics: [],
      focusAreas: selected.map((key) => ({
        key,
        label: label(key),
        reason: input.focusAreas?.length
          ? "Selected explicitly for this practice session."
          : "A deterministic local focus for the selected interview type.",
        source: "default" as const,
      })),
      questionCount: input.questionCount,
      maxFollowUpsPerQuestion: 2,
    },
    contextSources: ["Deterministic local practice"],
    intelligenceStatus: "ready" as const,
  };
}

function aggregateLocalObservations(session: StoredMockInterview) {
  const candidates = (session.turns ?? []).flatMap((turn) => turn.evaluation?.observationCandidates ?? []);
  const counts = new Map<string, typeof candidates>();
  for (const item of candidates) {
    const key = `${item.type}:${item.dimension}`;
    counts.set(key, [...(counts.get(key) ?? []), item]);
  }
  return [...counts.values()].filter((items) => items.length >= 2).map((items) => ({
    type: items[0].type,
    dimension: items[0].dimension,
    summary: items[0].summary,
    confidence: Math.min(0.95, items.reduce((sum, item) => sum + item.confidence, 0) / items.length),
    evidenceCount: items.length,
  }));
}

function dimensionValues(scorecard: MockInterviewScorecard) {
  return {
    clarity: scorecard.communicationScore,
    accuracy: scorecard.technicalAccuracyScore,
    structure: scorecard.structureScore,
    depth: scorecard.depthScore,
    relevance: scorecard.relevanceScore,
  };
}
function strongestDimension(scorecard: MockInterviewScorecard) {
  return Object.entries(dimensionValues(scorecard)).sort((a, b) => b[1] - a[1])[0][0];
}
function weakestDimension(scorecard: MockInterviewScorecard) {
  return Object.entries(dimensionValues(scorecard)).sort((a, b) => a[1] - b[1])[0][0];
}
function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
