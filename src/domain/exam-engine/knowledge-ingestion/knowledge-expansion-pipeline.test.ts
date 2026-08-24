import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation, SourceReference } from "@/domain/exam-engine/types";
import { detectDuplicateFact } from "./fact-duplicate-detector";
import { analyzeNewKnowledgeSource } from "./knowledge-expansion-pipeline";
import { findRelatedExistingFacts } from "./related-existing-facts";
import type { FactCandidate, KnowledgeSourceInput } from "./knowledge-ingestion";

const sourceReference: SourceReference = { documentId: "law", revisionId: "rev-1", locator: "제1조" };

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "concept:report",
    subject: "초경량비행장치 소유자",
    predicate: "신고",
    value: "신고",
    statement: "초경량비행장치 소유자는 장치를 신고하여야 한다",
    conditions: [],
    exceptions: [],
    sourceReferences: [sourceReference],
    version: "1",
    status: "approved",
    ...overrides
  };
}

function candidate(overrides: Partial<FactCandidate> = {}): FactCandidate {
  return {
    candidateId: "SRC-1:candidate-001",
    sourceId: "SRC-1",
    statement: "초경량비행장치 소유자는 장치를 신고하여야 한다",
    conceptHint: "concept:report",
    categoryHint: "category:registration",
    extractedNumbers: [],
    extractedConditions: [],
    extractedExceptions: [],
    confidence: 0.8,
    sourceReference,
    status: "draft",
    ...overrides
  };
}

function source(content: string): KnowledgeSourceInput {
  return {
    sourceId: "SRC-1",
    sourceType: "LAW",
    title: "항공안전법",
    version: "2026-07-28",
    content,
    sourceReference
  };
}

describe("knowledge ingestion expansion", () => {
  it("detects duplicate fact candidates by statement, concept, value, unit, and source", () => {
    const result = detectDuplicateFact(candidate(), [fact()]);

    expect(result.isDuplicate).toBe(true);
    expect(result.matchedFactIds).toEqual(["AF-001"]);
    expect(result.confidence).toBeGreaterThanOrEqual(0.78);
    expect(result.reasons).toContain("similar statement");
  });

  it("keeps different concept candidates available for review", () => {
    const result = detectDuplicateFact(candidate({
      statement: "조종자는 비행 전 안전점검을 하여야 한다",
      conceptHint: "concept:safety"
    }), [fact()]);

    expect(result.isDuplicate).toBe(false);
    expect(result.matchedFactIds).toEqual([]);
  });

  it("creates candidates from a source and preserves sourceReference", () => {
    const result = analyzeNewKnowledgeSource(source("신고 대상 장치는 25kg 이상인 경우 신고하여야 한다. 조종자 자격은 법령 기준을 충족하여야 한다."), []);

    expect(result.reviewCandidates).toHaveLength(2);
    expect(result.reviewCandidates[0].sourceReference).toEqual(sourceReference);
    expect(result.reviewCandidates[0].extractedNumbers).toContain("25kg");
  });

  it("classifies duplicate candidates separately from review candidates", () => {
    const result = analyzeNewKnowledgeSource(source("초경량비행장치 소유자는 장치를 신고하여야 한다. 조종자는 비행 전 안전점검을 하여야 한다."), [fact()]);

    expect(result.duplicateCandidates.map((item) => item.statement)).toContain("초경량비행장치 소유자는 장치를 신고하여야 한다");
    expect(result.reviewCandidates.map((item) => item.statement)).toContain("조종자는 비행 전 안전점검을 하여야 한다");
  });

  it("finds related existing facts without mutating them", () => {
    const existing = [fact(), fact({ id: "AF-002", conceptId: "concept:approval", predicate: "승인", value: 25, statement: "25kg 기준 승인이 필요하다" })];
    const before = JSON.stringify(existing);
    const relations: KnowledgeRelation[] = [{
      id: "REL-1",
      packId: "pack",
      fromFactId: "AF-002",
      toFactId: "AF-999",
      relationType: "RELATED",
      reason: "already related",
      confidence: 0.8,
      createdAt: "2026-07-28T00:00:00.000Z",
      reviewStatus: "approved"
    }];

    const related = findRelatedExistingFacts(candidate({
      statement: "25kg 이상 장치는 승인을 받아야 한다",
      conceptHint: "concept:approval",
      extractedNumbers: ["25kg", "25"]
    }), existing, relations);

    expect(related.map((item) => item.factId)).toContain("AF-002");
    expect(related.some((item) => item.relationHint === "same_concept")).toBe(true);
    expect(JSON.stringify(existing)).toBe(before);
  });
});
