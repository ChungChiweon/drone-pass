import { describe, expect, it } from "vitest";
import type { AtomicFact, ExamValueScore, KnowledgeRelation } from "@/domain/exam-engine/types";
import { scoreRelationQuality } from "./relation-curation-scorer";
import { curateRelations } from "./relation-curation-pipeline";

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "subject",
    predicate: "predicate",
    value: 25,
    unit: "kg",
    statement: "statement",
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
    version: "1",
    status: "draft",
    ...overrides
  };
}

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "CONFUSED_WITH",
    reason: "confusable",
    confidence: 0.95,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

function examScore(factId: string, overallScore: number): ExamValueScore {
  return {
    packId: "pack-a",
    factId,
    frequencyScore: 0.5,
    confusionScore: 0.8,
    importanceScore: 0.9,
    numericRiskScore: 0.7,
    penaltyRiskScore: 0.2,
    difficultyScore: 0.6,
    overallScore,
    reason: "",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft"
  };
}

describe("scoreRelationQuality", () => {
  it("gives high scores to strong CONFUSED_WITH relations", () => {
    const score = scoreRelationQuality(relation(), [
      fact({ id: "AF-001", conceptId: "C-1" }),
      fact({ id: "AF-002", conceptId: "C-2" })
    ], [examScore("AF-001", 0.95), examScore("AF-002", 0.9)]);

    expect(score.overallScore).toBeGreaterThanOrEqual(0.8);
    expect(score.examRelevanceScore).toBeGreaterThan(0.8);
  });

  it("penalizes broad SAME_CONCEPT relations", () => {
    const sameConcept = scoreRelationQuality(relation({ relationType: "SAME_CONCEPT", confidence: 0.75 }), [
      fact({ id: "AF-001", conceptId: "C-1", sourceReferences: [] }),
      fact({ id: "AF-002", conceptId: "C-1", sourceReferences: [] })
    ], [examScore("AF-001", 0.3), examScore("AF-002", 0.3)]);

    expect(sameConcept.overallScore).toBeLessThan(0.6);
    expect(sameConcept.redundancyScore).toBeGreaterThan(0.5);
    expect(sameConcept.riskScore).toBeGreaterThan(0.4);
  });
});

describe("curateRelations", () => {
  it("deduplicates relation pairs and classifies candidates", () => {
    const result = curateRelations([
      relation({ id: "REL-1", fromFactId: "AF-001", toFactId: "AF-002" }),
      relation({ id: "REL-2", fromFactId: "AF-002", toFactId: "AF-001" }),
      relation({ id: "REL-3", relationType: "SAME_CONCEPT", fromFactId: "AF-003", toFactId: "AF-004", confidence: 0.45 })
    ], [
      fact({ id: "AF-001", conceptId: "C-1" }),
      fact({ id: "AF-002", conceptId: "C-2" }),
      fact({ id: "AF-003", conceptId: "C-3", sourceReferences: [] }),
      fact({ id: "AF-004", conceptId: "C-3", sourceReferences: [] })
    ], [
      examScore("AF-001", 0.95),
      examScore("AF-002", 0.95),
      examScore("AF-003", 0.1),
      examScore("AF-004", 0.1)
    ]);

    expect(result.totalRelations).toBe(2);
    expect(result.reviewCandidates.length).toBeGreaterThan(0);
    expect(result.rejectedCandidates.length).toBeGreaterThanOrEqual(0);
    expect(result.scores[0].overallScore).toBeGreaterThanOrEqual(result.scores.at(-1)?.overallScore ?? 0);
  });

  it("does not mutate relation inputs", () => {
    const relations = [
      relation({ id: "REL-1" }),
      relation({ id: "REL-2", relationType: "COMPARISON_PAIR", toFactId: "AF-003" })
    ];
    const facts = [fact({ id: "AF-001" }), fact({ id: "AF-002" }), fact({ id: "AF-003" })];
    const snapshot = JSON.stringify({ relations, facts });

    curateRelations(relations, facts, [examScore("AF-001", 0.8), examScore("AF-002", 0.8), examScore("AF-003", 0.8)]);

    expect(JSON.stringify({ relations, facts })).toBe(snapshot);
  });
});
