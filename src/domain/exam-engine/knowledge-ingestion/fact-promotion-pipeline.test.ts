import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation, SourceDocument } from "@/domain/exam-engine/types";
import { createPromotionPreview } from "./fact-promotion-pipeline";
import { validateFactPromotion } from "./fact-promotion-validator";
import type { FactCandidate } from "./knowledge-ingestion";

const sourceReference = { documentId: "law", revisionId: "rev-1", locator: "제1조" };
const sourceDocuments: SourceDocument[] = [{ id: "law", title: "항공안전법", publisher: "MOLIT", note: "" }];

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-433",
    conceptId: "concept:approval",
    subject: "장치",
    predicate: "승인",
    value: 25,
    unit: "kg",
    statement: "25kg 이상 장치는 승인을 받아야 한다",
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
    candidateId: "SRC:candidate-001",
    sourceId: "SRC",
    statement: "25kg 이상 장치는 별도 신고를 하여야 한다",
    conceptHint: "concept:approval",
    categoryHint: "category:flight-approval",
    extractedNumbers: ["25kg", "25"],
    extractedConditions: ["이상"],
    extractedExceptions: [],
    confidence: 0.86,
    sourceReference,
    status: "accepted",
    ...overrides
  };
}

describe("fact promotion pipeline", () => {
  it("creates a valid promotion preview for an accepted candidate", () => {
    const preview = createPromotionPreview([candidate()], [fact()], [], sourceDocuments)[0];

    expect(preview).toMatchObject({
      candidateId: "SRC:candidate-001",
      proposedFactId: "AF-434",
      statement: "25kg 이상 장치는 별도 신고를 하여야 한다",
      conceptId: "concept:approval",
      categoryId: "category:flight-approval"
    });
    expect(preview.validationResult.valid).toBe(true);
    expect(preview.graphConnectionCandidates.relatedFactIds).toContain("AF-433");
    expect(preview.graphConnectionCandidates.suggestedRelations.some((relation) => relation.relationType === "SAME_CONCEPT")).toBe(true);
  });

  it("reports source errors before promotion", () => {
    const result = validateFactPromotion(candidate({ sourceReference: { documentId: "", locator: "" } }), [fact()], sourceDocuments);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("sourceReference is required");
  });

  it("blocks confirmed duplicate candidates", () => {
    const result = validateFactPromotion(candidate({
      statement: "25kg 이상 장치는 승인을 받아야 한다",
      conceptHint: "concept:approval",
      categoryHint: "category:flight-approval"
    }), [fact()], sourceDocuments);

    expect(result.valid).toBe(false);
    expect(result.errors.some((error) => error.startsWith("duplicate fact confirmed"))).toBe(true);
  });

  it("generates graph connection candidates without approving relations", () => {
    const relations: KnowledgeRelation[] = [{
      id: "REL-1",
      packId: "pack",
      fromFactId: "AF-433",
      toFactId: "AF-100",
      relationType: "RELATED",
      reason: "approved relation",
      confidence: 0.8,
      createdAt: "2026-07-28T00:00:00.000Z",
      reviewStatus: "approved"
    }];
    const preview = createPromotionPreview([candidate()], [fact()], relations, sourceDocuments)[0];

    expect(preview.graphConnectionCandidates.suggestedRelations.every((relation) => relation.toFactId !== preview.proposedFactId)).toBe(true);
    expect(preview.graphConnectionCandidates.suggestedRelations.map((relation) => relation.relationType)).toEqual(expect.arrayContaining(["SAME_CONCEPT", "COMPARISON_PAIR", "CONFUSED_WITH"]));
  });

  it("does not mutate existing facts", () => {
    const existing = [fact()];
    const before = JSON.stringify(existing);
    createPromotionPreview([candidate()], existing, [], sourceDocuments);

    expect(JSON.stringify(existing)).toBe(before);
  });

  it("ignores non-accepted candidates", () => {
    expect(createPromotionPreview([candidate({ status: "review_candidate" })], [fact()], [], sourceDocuments)).toEqual([]);
  });
});
