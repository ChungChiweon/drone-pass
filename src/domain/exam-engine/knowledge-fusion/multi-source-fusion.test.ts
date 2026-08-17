import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { calculateExamCoverage } from "@/domain/exam-engine/coverage/exam-coverage-calculator";
import { decideFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/auto-promotion/auto-promotion-engine";
import { validateFactPromotion } from "@/domain/exam-engine/knowledge-ingestion/fact-promotion-validator";
import type { FactCandidate } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { DRONE_BASIC_EXAM_BLUEPRINT } from "@/domain/exam-engine/selection/exam-selection";
import type { AtomicFact } from "@/domain/exam-engine/types";
import {
  createKnowledgeSourceRegistry,
  detectSourceConflicts,
  fuseKnowledgeSources,
  mergeFactEvidence,
  resolvePreferredEvidence,
  sourcePriorityScore,
  type KnowledgeSourceRecord,
  type SourceRelationship
} from ".";

const REPORT = "docs/multi-source-fusion-report.md";

describe("Multi Source Knowledge Fusion Engine", () => {
  it("registers sources, merges evidence, detects conflicts, and writes the simulation report", () => {
    const sources = sampleSources();
    const relationships: SourceRelationship[] = [
      { parentSourceId: "air-safety-act", childSourceId: "air-safety-decree", relationshipType: "IMPLEMENTS" },
      { parentSourceId: "air-safety-decree", childSourceId: "official-guide", relationshipType: "EXPLAINS" }
    ];
    const registry = createKnowledgeSourceRegistry(sources);
    const sourceCandidates = [
      { source: sources[0], candidates: [candidate("law-001", sources[0].sourceId, "150kg 이상 무인비행장치는 신고 기준을 충족해야 한다.", ["150"], 0.72)] },
      { source: sources[1], candidates: [candidate("decree-001", sources[1].sourceId, "150kg 이상 무인비행장치는 신고 기준을 충족해야 한다.", ["150"], 0.76)] },
      { source: sources[2], candidates: [candidate("guide-001", sources[2].sourceId, "150kg 이상 무인비행장치는 신고 기준을 충족해야 한다.", ["150"], 0.68)] }
    ];
    const conflictingCandidates = [
      candidate("law-002", sources[0].sourceId, "초경량비행장치 기준은 25kg 이하이다.", ["25"], 0.74),
      candidate("textbook-002", "textbook-old", "초경량비행장치 기준은 30kg 이하이다.", ["30"], 0.58)
    ];
    const fusion = fuseKnowledgeSources([
      ...sourceCandidates,
      { source: sampleTextbook(), candidates: [conflictingCandidates[1]] },
      { source: sources[0], candidates: [conflictingCandidates[0]] }
    ], relationships);
    const evidence = mergeFactEvidence(sourceCandidates.flatMap((item) => item.candidates), sources);
    const conflicts = detectSourceConflicts(conflictingCandidates);
    const preferred = resolvePreferredEvidence([sources[2], sources[1], sources[0]]);
    const beforePromotion = decideFactPromotion(sourceCandidates[0].candidates[0], promotionContext(sourceCandidates[0].candidates[0], [], 0));
    const afterPromotion = decideFactPromotion(sourceCandidates[0].candidates[0], promotionContext(sourceCandidates[0].candidates[0], evidence[0].candidateIds, fusion.confidence));
    const coverageBefore = coverage(approvedFacts(26), []);
    const coverageAfter = coverage(approvedFacts(26), sourceCandidates.flatMap((item) => item.candidates));

    writeFileSync(join(process.cwd(), REPORT), renderReport({
      sources: registry.sources,
      relationships,
      evidence,
      fusion,
      conflicts,
      preferredSourceId: preferred?.source.sourceId ?? "-",
      beforePromotion: beforePromotion.decision,
      afterPromotion: afterPromotion.decision,
      beforePromotionScore: beforePromotion.score,
      afterPromotionScore: afterPromotion.score,
      coverageBefore,
      coverageAfter
    }), "utf8");

    expect(registry.sources).toHaveLength(3);
    expect(evidence[0].sourceCount).toBe(3);
    expect(evidence[0].confidenceIncrease).toBeGreaterThan(0);
    expect(conflicts[0].severity).toBe("HIGH");
    expect(preferred?.source.sourceId).toBe("air-safety-act");
    expect(fusion.confidence).toBeGreaterThan(0.3);
    expect(afterPromotion.score).toBeGreaterThanOrEqual(beforePromotion.score);
  });
});

function sampleSources(): KnowledgeSourceRecord[] {
  return [
    { sourceId: "air-safety-act", title: "Aviation Safety Act", sourceType: "LAW", authority: "MOLIT", version: "2026-current", priority: "OFFICIAL_PRIMARY", collectedAt: "2026-08-02" },
    { sourceId: "air-safety-decree", title: "Aviation Safety Act Enforcement Decree", sourceType: "DECREE", authority: "MOLIT", version: "2026-current", priority: "OFFICIAL_SECONDARY", collectedAt: "2026-08-02" },
    { sourceId: "official-guide", title: "Official Drone Registration Guide", sourceType: "GUIDELINE", authority: "TS", version: "2026-guide", priority: "OFFICIAL_SECONDARY", collectedAt: "2026-08-02" }
  ];
}

function sampleTextbook(): KnowledgeSourceRecord {
  return { sourceId: "textbook-old", title: "Training Textbook", sourceType: "TEXTBOOK", authority: "education", version: "2023", priority: "EDUCATIONAL", collectedAt: "2026-08-02" };
}

function candidate(candidateId: string, sourceId: string, statement: string, numbers: string[], confidence: number): FactCandidate {
  return {
    candidateId,
    sourceId,
    statement,
    conceptHint: "concept:report",
    categoryHint: "cat-report-procedure",
    extractedNumbers: numbers,
    extractedConditions: ["신고 기준"],
    extractedExceptions: [],
    confidence,
    sourceReference: {
      documentId: sourceId,
      locator: "simulation:article-1"
    },
    status: "draft"
  };
}

function promotionContext(candidate: FactCandidate, supportingCandidateIds: string[], fusionConfidence: number) {
  return {
    validation: validateFactPromotion(candidate, []),
    duplicateResult: { isDuplicate: false, matchedFactIds: [], confidence: 0, reasons: [] },
    sourceType: "LAW" as const,
    graphContext: {
      relatedFactCount: supportingCandidateIds.length,
      compatibleRelationCount: supportingCandidateIds.length,
      contradictionCount: 0,
      examValueScore: Math.max(candidate.confidence, fusionConfidence)
    },
    expansionScore: Math.max(candidate.confidence, fusionConfidence)
  };
}

function approvedFacts(count: number): AtomicFact[] {
  return Array.from({ length: count }, (_, index) => ({
    id: `AF-${String(index + 1).padStart(3, "0")}`,
    conceptId: index < 13 ? "concept:existing-a" : "concept:existing-b",
    subject: "subject",
    predicate: "predicate",
    value: index,
    statement: `approved fact ${index + 1}`,
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "seed", locator: `seed:${index + 1}` }],
    version: "1",
    status: "approved"
  }));
}

function coverage(facts: AtomicFact[], candidates: FactCandidate[]) {
  const candidateFacts: AtomicFact[] = candidates.map((item, index) => ({
    id: `SIM-${index + 1}`,
    conceptId: item.conceptHint ?? `sim-concept-${index + 1}`,
    subject: "candidate",
    predicate: "candidate",
    value: item.extractedNumbers[0] ?? item.statement,
    statement: item.statement,
    conditions: [],
    exceptions: [],
    sourceReferences: [item.sourceReference],
    version: "simulation",
    status: "approved"
  }));
  const allFacts = [...facts, ...candidateFacts];
  return calculateExamCoverage(allFacts, allFacts, [{
    id: "select-true",
    questionType: "SELECT_TRUE",
    stemTemplate: "{{statement}}",
    explanationTemplate: "{{statement}}",
    difficulty: "easy"
  }], {
    ...DRONE_BASIC_EXAM_BLUEPRINT,
    examSize: 40
  }, {
    concepts: [
      { id: "concept:existing-a", subjectId: "subject", categoryIds: ["cat-existing"], title: "existing", summary: "existing" },
      { id: "concept:existing-b", subjectId: "subject", categoryIds: ["cat-existing"], title: "existing", summary: "existing" },
      { id: "concept:report", subjectId: "subject", categoryIds: ["cat-report-procedure"], title: "report", summary: "report" }
    ]
  });
}

function renderReport(input: {
  sources: KnowledgeSourceRecord[];
  relationships: SourceRelationship[];
  evidence: ReturnType<typeof mergeFactEvidence>;
  fusion: ReturnType<typeof fuseKnowledgeSources>;
  conflicts: ReturnType<typeof detectSourceConflicts>;
  preferredSourceId: string;
  beforePromotion: string;
  afterPromotion: string;
  beforePromotionScore: number;
  afterPromotionScore: number;
  coverageBefore: ReturnType<typeof coverage>;
  coverageAfter: ReturnType<typeof coverage>;
}) {
  return [
    "# Multi Source Fusion Report",
    "",
    "## Source Registry",
    "",
    table(["Source", "Type", "Priority", "Version", "Priority score"], input.sources.map((source) => [
      source.sourceId,
      source.sourceType,
      source.priority,
      source.version,
      fixed(sourcePriorityScore(source))
    ])),
    "",
    "## Source Relationships",
    "",
    table(["Parent", "Child", "Type"], input.relationships.map((relationship) => [
      relationship.parentSourceId,
      relationship.childSourceId,
      relationship.relationshipType
    ])),
    "",
    "## Fusion Result",
    "",
    table(["Metric", "Value"], [
      ["Merged facts", String(input.fusion.mergedFacts.length)],
      ["Fusion confidence", fixed(input.fusion.confidence)],
      ["Supporting sources", String(input.fusion.supportingSources.length)],
      ["Preferred source", input.preferredSourceId]
    ]),
    "",
    "## Evidence Merge",
    "",
    table(["Pattern", "Sources", "Agreement", "Confidence increase"], input.evidence.map((item) => [
      item.factPattern,
      String(item.sourceCount),
      fixed(item.sourceAgreement),
      fixed(item.confidenceIncrease)
    ])),
    "",
    "## Conflicts",
    "",
    table(["Conflict", "Severity", "Type", "Reason"], input.conflicts.map((conflict) => [
      conflict.conflictId,
      conflict.severity,
      conflict.conflictType,
      conflict.reason
    ])),
    "",
    "## Auto Promotion Change",
    "",
    table(["Metric", "Before", "After Fusion"], [
      ["Decision", input.beforePromotion, input.afterPromotion],
      ["Score", fixed(input.beforePromotionScore), fixed(input.afterPromotionScore)]
    ]),
    "",
    "## Coverage Change",
    "",
    table(["Metric", "Before", "After Fusion Simulation"], [
      ["Possible questions", String(input.coverageBefore.possibleQuestionCount), String(input.coverageAfter.possibleQuestionCount)],
      ["Missing coverage", String(input.coverageBefore.missingCoverage.length), String(input.coverageAfter.missingCoverage.length)]
    ]),
    "",
    "## Decision Support",
    "",
    "- SOURCE_FUSION_REQUIRED: use this when a candidate has only one weak source, or when law/decree/guideline sources have not been cross-checked.",
    "- Conflicting numeric/date/condition evidence must stay in human review.",
    "",
    "## Safety",
    "",
    "- No AtomicFact creation.",
    "- No Fact status change.",
    "- No KnowledgePack write.",
    "- No Graph or Graph Version change.",
    "- No Question DB write.",
    "- No Supabase change.",
    ""
  ].join("\n");
}

function table(headers: string[], rows: string[][]) {
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.join(" | ")} |`)
  ].join("\n");
}

function fixed(value: number) {
  return value.toFixed(3);
}
