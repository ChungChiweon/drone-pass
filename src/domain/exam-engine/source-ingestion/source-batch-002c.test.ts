import { describe, expect, it } from "vitest";
import { normalizeTableReviewDecision } from "./table-review-decision";
import { planLegalValidationBatches } from "../legal-validation/legal-validation-batch-planner";

describe("SOURCE-BATCH-002C fail-closed review and legal batches", () => {
  it("does not verify a table without an explicit human decision", () => {
    expect(normalizeTableReviewDecision({ tableId: "t", resolvedRegions: [], resolvedFootnotes: [], evidence: [], confidence: 0, notes: [] }).reviewerDecision).toBe("UNRESOLVED");
  });

  it("groups candidates by legal area rather than question count", () => {
    const batches = planLegalValidationBatches([
      { candidateId: "c1", sourceId: "law", subject: "과태료", examRelevance: "HIGH", validationEligibility: "ELIGIBLE", blockers: [] },
      { candidateId: "c2", sourceId: "law", subject: "조종자 증명", examRelevance: "MEDIUM", validationEligibility: "BLOCKED_TABLE_UNRESOLVED", blockers: ["TABLE_UNRESOLVED"] },
      { candidateId: "c3", sourceId: "law", subject: "후순위", examRelevance: "LOW", validationEligibility: "ELIGIBLE", blockers: [] },
    ]);
    expect(batches.map((batch) => batch.batchId)).toEqual(["VALIDATION-BATCH-002", "VALIDATION-BATCH-006"]);
    expect(batches.find((batch) => batch.batchId === "VALIDATION-BATCH-002")?.status).toBe("BLOCKED");
    expect(batches.flatMap((batch) => batch.candidateIds)).not.toContain("c3");
  });
});
