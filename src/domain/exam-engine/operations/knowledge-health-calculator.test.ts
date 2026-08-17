import { describe, expect, it } from "vitest";
import type { AtomicFact, KnowledgeRelation, SourceDocument } from "@/domain/exam-engine/types";
import type { KnowledgeFactLifecycle } from "@/domain/exam-engine/knowledge-lifecycle/knowledge-lifecycle";
import { calculateKnowledgeHealth } from "./knowledge-health-calculator";

const sourceReference = { documentId: "law", revisionId: "rev-1", locator: "제1조" };

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "장치",
    predicate: "신고",
    value: "신고",
    statement: "초경량비행장치는 신고하여야 한다",
    conditions: [],
    exceptions: [],
    sourceReferences: [sourceReference],
    version: "1",
    status: "approved",
    ...overrides
  };
}

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "RELATED",
    reason: "related",
    confidence: 0.8,
    createdAt: "2026-07-28T00:00:00.000Z",
    reviewStatus: "approved",
    ...overrides
  };
}

const sources: SourceDocument[] = [{ id: "law", title: "항공안전법", publisher: "MOLIT", note: "" }];

describe("calculateKnowledgeHealth", () => {
  it("summarizes fact and relation state", () => {
    const summary = calculateKnowledgeHealth([
      fact({ id: "AF-001", status: "approved" }),
      fact({ id: "AF-002", status: "draft" }),
      fact({ id: "AF-003", status: "expired" })
    ], [
      relation({ id: "REL-1", reviewStatus: "approved" }),
      relation({ id: "REL-2", reviewStatus: "draft" })
    ], [], { activeGraphVersion: "kg-v1" }, sources);

    expect(summary).toMatchObject({
      totalFacts: 3,
      activeFacts: 1,
      draftFacts: 1,
      deprecatedFacts: 1,
      totalRelations: 2,
      approvedRelations: 1,
      pendingRelations: 1,
      totalSources: 1
    });
  });

  it("uses lifecycle status over fact status when provided", () => {
    const lifecycle: KnowledgeFactLifecycle[] = [{
      factId: "AF-001",
      currentVersion: "1",
      status: "deprecated",
      createdAt: "2026-07-28T00:00:00.000Z",
      updatedAt: "2026-07-28T00:00:00.000Z"
    }];

    expect(calculateKnowledgeHealth([fact()], [], lifecycle, { activeGraphVersion: "kg-v1" }).deprecatedFacts).toBe(1);
  });

  it("generates high warnings for missing active graph and low source coverage", () => {
    const summary = calculateKnowledgeHealth([
      fact({ id: "AF-001", sourceReferences: [] }),
      fact({ id: "AF-002", sourceReferences: [] })
    ], [], [], {});

    expect(summary.warningLevel).toBe("HIGH");
    expect(summary.warnings.map((warning) => warning.code)).toEqual(expect.arrayContaining(["ACTIVE_GRAPH_MISSING", "LOW_SOURCE_COVERAGE"]));
  });

  it("generates medium warnings for review backlog", () => {
    const summary = calculateKnowledgeHealth([fact()], [], [], {
      activeGraphVersion: "kg-v1",
      factReviewQueueCount: 10,
      graphReviewQueueCount: 10
    });

    expect(summary.warningLevel).toBe("MEDIUM");
    expect(summary.warnings.map((warning) => warning.code)).toContain("REVIEW_BACKLOG_GROWING");
  });

  it("does not mutate input facts", () => {
    const facts = [fact()];
    const before = JSON.stringify(facts);
    calculateKnowledgeHealth(facts, [relation()], [], { activeGraphVersion: "kg-v1" });

    expect(JSON.stringify(facts)).toBe(before);
  });
});
