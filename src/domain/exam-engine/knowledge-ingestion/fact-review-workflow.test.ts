import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { buildFactReviewQueue } from "./fact-review-queue";
import { reviewCandidate } from "./fact-review-service";
import type { FactCandidate } from "./knowledge-ingestion";

const sourceReference = { documentId: "law", revisionId: "rev-1", locator: "제1조" };

function fact(overrides: Partial<AtomicFact> = {}): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "concept:report",
    subject: "소유자",
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
    candidateId: "SRC:candidate-001",
    sourceId: "SRC",
    statement: "초경량비행장치 소유자는 장치를 신고하여야 한다",
    conceptHint: "concept:report",
    categoryHint: "category:registration",
    extractedNumbers: [],
    extractedConditions: [],
    extractedExceptions: [],
    confidence: 0.9,
    sourceReference,
    status: "duplicate_candidate",
    ...overrides
  };
}

describe("fact candidate review workflow", () => {
  it("builds a queue with duplicate candidates first", () => {
    const queue = buildFactReviewQueue([
      candidate({ candidateId: "review", statement: "새로운 안전점검 기준은 비행 전 확인하여야 한다", status: "review_candidate", confidence: 0.95 }),
      candidate({ candidateId: "dup" })
    ], [fact()], [], { SRC: "LAW" });

    expect(queue.map((item) => item.candidate.candidateId)).toEqual(["dup", "review"]);
    expect(queue[0].duplicateMatches.isDuplicate).toBe(true);
    expect(queue[0].priority).toBeGreaterThan(0);
  });

  it("accepts, rejects, and holds candidates without creating AtomicFacts", () => {
    const original = candidate({ status: "review_candidate" });
    const accepted = reviewCandidate({ candidate: original, action: "ACCEPT", reviewerId: "admin", timestamp: "2026-07-28T00:00:00.000Z" });
    const rejected = reviewCandidate({ candidate: original, action: "REJECT" });
    const held = reviewCandidate({ candidate: original, action: "HOLD", memo: "check later" });

    expect(original.status).toBe("review_candidate");
    expect(accepted.candidate.status).toBe("accepted");
    expect(accepted.review).toMatchObject({ action: "ACCEPT", previousStatus: "review_candidate", nextStatus: "accepted" });
    expect(rejected.candidate.status).toBe("rejected");
    expect(held.candidate.status).toBe("held");
  });

  it("creates merge proposal only for MERGE action", () => {
    const item = buildFactReviewQueue([candidate()], [fact()])[0];
    const result = reviewCandidate({
      candidate: item.candidate,
      action: "MERGE",
      duplicateMatches: item.duplicateMatches,
      timestamp: "2026-07-28T00:00:00.000Z"
    });

    expect(result.candidate.status).toBe("duplicate_candidate");
    expect(result.mergeProposal).toMatchObject({
      candidateId: "SRC:candidate-001",
      targetFactId: "AF-001"
    });
  });

  it("does not mutate existing facts while building review queue", () => {
    const existing = [fact()];
    const before = JSON.stringify(existing);
    buildFactReviewQueue([candidate()], existing);

    expect(JSON.stringify(existing)).toBe(before);
  });
});
