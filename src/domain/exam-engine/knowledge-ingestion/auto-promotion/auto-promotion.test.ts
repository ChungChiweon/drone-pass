import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { FactCandidate, FactDuplicateResult, FactPromotionValidationResult } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { decideFactPromotion } from "./auto-promotion-engine";
import { analyzeCandidates } from "./batch-promotion-analyzer";
import type { CandidateAnalysisInput } from "./auto-promotion";

const REPORT_PATH = path.join(process.cwd(), "docs", "autonomous-fact-promotion-report.md");

describe("Autonomous Fact Promotion Engine", () => {
  it("classifies a high quality legal candidate as AUTO_APPROVE_CANDIDATE", () => {
    const decision = decideFactPromotion(candidate(), {
      validation: valid(),
      duplicateResult: duplicate({ isDuplicate: false, confidence: 0 }),
      sourceType: "LAW",
      graphContext: {
        relatedFactCount: 4,
        compatibleRelationCount: 3,
        contradictionCount: 0,
        examValueScore: 0.82,
        expectedQuestionIncrease: 2,
        expectedCoverageIncrease: 2
      }
    });

    expect(decision.decision).toBe("AUTO_APPROVE_CANDIDATE");
    expect(decision.requiresHumanReview).toBe(false);
    expect(decision.score).toBeGreaterThanOrEqual(0.9);
  });

  it("rejects a candidate without source reference", () => {
    const decision = decideFactPromotion(candidate({
      sourceReference: { documentId: "", locator: "" },
      confidence: 0.8
    }), {
      validation: valid({ valid: false, errors: ["sourceReference is required"] }),
      duplicateResult: duplicate({ isDuplicate: false, confidence: 0 }),
      sourceType: "OTHER",
      graphContext: { relatedFactCount: 2, examValueScore: 0.7 }
    });

    expect(decision.decision).toBe("REJECT_CANDIDATE");
    expect(decision.risks.some((risk) => risk.code === "SOURCE_REFERENCE_MISSING")).toBe(true);
  });

  it("rejects duplicate candidates", () => {
    const decision = decideFactPromotion(candidate(), {
      validation: valid({ valid: false, errors: ["duplicate fact confirmed: AF-001"] }),
      duplicateResult: duplicate({ isDuplicate: true, confidence: 0.94, matchedFactIds: ["AF-001"] }),
      sourceType: "LAW",
      graphContext: { relatedFactCount: 3, examValueScore: 0.8 }
    });

    expect(decision.decision).toBe("REJECT_CANDIDATE");
    expect(decision.risks.some((risk) => risk.code === "DUPLICATE_CONFIRMED")).toBe(true);
  });

  it("rejects contradiction risks", () => {
    const decision = decideFactPromotion(candidate(), {
      validation: valid(),
      duplicateResult: duplicate({ isDuplicate: false, confidence: 0 }),
      sourceType: "REGULATION",
      graphContext: { relatedFactCount: 4, contradictionCount: 1, examValueScore: 0.9 }
    });

    expect(decision.decision).toBe("REJECT_CANDIDATE");
    expect(decision.risks.some((risk) => risk.code === "CONTRADICTION_DETECTED")).toBe(true);
  });

  it("keeps medium quality candidates for human review", () => {
    const decision = decideFactPromotion(candidate({ conceptHint: undefined, categoryHint: undefined, confidence: 0.68 }), {
      validation: valid({ warnings: ["concept is not confirmed", "category is not confirmed"] }),
      duplicateResult: duplicate({ isDuplicate: false, confidence: 0.1 }),
      sourceType: "TEXTBOOK",
      graphContext: { relatedFactCount: 0, compatibleRelationCount: 0, examValueScore: 0.52 }
    });

    expect(decision.decision).toBe("REVIEW_REQUIRED");
    expect(decision.requiresHumanReview).toBe(true);
  });

  it("aggregates batch decisions and writes the simulation report", () => {
    const inputs: CandidateAnalysisInput[] = [
      { candidate: candidate({ candidateId: "FC-A" }), context: { validation: valid(), duplicateResult: duplicate({ isDuplicate: false, confidence: 0 }), sourceType: "LAW", graphContext: { relatedFactCount: 4, compatibleRelationCount: 3, examValueScore: 0.82, expectedQuestionIncrease: 2, expectedCoverageIncrease: 2 } } },
      { candidate: candidate({ candidateId: "FC-B", sourceReference: { documentId: "", locator: "" } }), context: { validation: valid({ valid: false, errors: ["sourceReference is required"] }), duplicateResult: duplicate({ isDuplicate: false, confidence: 0 }), sourceType: "OTHER", graphContext: { examValueScore: 0.2 } } },
      { candidate: candidate({ candidateId: "FC-C" }), context: { validation: valid({ warnings: ["concept is not confirmed"] }), duplicateResult: duplicate({ isDuplicate: false, confidence: 0.2 }), sourceType: "TEXTBOOK", graphContext: { relatedFactCount: 1, examValueScore: 0.55, expectedQuestionIncrease: 1, expectedCoverageIncrease: 1 } } },
      { candidate: candidate({ candidateId: "FC-D" }), context: { validation: valid({ valid: false, errors: ["duplicate fact confirmed: AF-001"] }), duplicateResult: duplicate({ isDuplicate: true, confidence: 0.95, matchedFactIds: ["AF-001"] }), sourceType: "LAW", graphContext: { relatedFactCount: 2, examValueScore: 0.8 } } }
    ];
    const report = analyzeCandidates(inputs);

    expect(report.totalCandidates).toBe(4);
    expect(report.autoApproveCandidates).toHaveLength(1);
    expect(report.reviewRequiredCandidates).toHaveLength(1);
    expect(report.rejectedCandidates).toHaveLength(2);
    expect(report.promotionCoverageImpact.expectedQuestionIncrease).toBe(2);

    fs.mkdirSync(path.dirname(REPORT_PATH), { recursive: true });
    fs.writeFileSync(REPORT_PATH, renderReport(report), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  });
});

function candidate(overrides: Partial<FactCandidate> = {}): FactCandidate {
  return {
    candidateId: "FC-001",
    sourceId: "law-source",
    statement: "항공사업법 시행령 별표 8에 따른 기준은 25kg 이상이다",
    conceptHint: "C-TEST",
    categoryHint: "cat-test",
    extractedNumbers: ["25"],
    extractedConditions: ["별표 8"],
    extractedExceptions: [],
    confidence: 0.95,
    sourceReference: { documentId: "aviation-business-enforcement-decree", locator: "별표 8" },
    status: "review_candidate",
    ...overrides
  };
}

function valid(overrides: Partial<FactPromotionValidationResult> = {}): FactPromotionValidationResult {
  return {
    valid: true,
    warnings: [],
    errors: [],
    ...overrides
  };
}

function duplicate(overrides: Partial<FactDuplicateResult> = {}): FactDuplicateResult {
  return {
    isDuplicate: false,
    matchedFactIds: [],
    confidence: 0,
    reasons: [],
    ...overrides
  };
}

function renderReport(report: ReturnType<typeof analyzeCandidates>) {
  return [
    "# Autonomous Fact Promotion Report",
    "",
    "## Promotion Score Criteria",
    "",
    "- sourceReference present: +0.20",
    "- official source type LAW/REGULATION: +0.15",
    "- duplicate none: +0.15",
    "- numeric/unit consistency: +0.15",
    "- legal reference signal: +0.15",
    "- graph connection possible: +0.10",
    "- high exam value: +0.10",
    "- duplicate candidate: -0.30",
    "- contradiction: -0.50",
    "- source missing: -0.50",
    "",
    "## Decision Rule",
    "",
    "- AUTO_APPROVE_CANDIDATE: score >= 0.90 and no duplicate/contradiction/validation error.",
    "- REVIEW_REQUIRED: score from 0.60 to below 0.90 without high-risk blockers.",
    "- REJECT_CANDIDATE: score < 0.60 or high-risk blocker.",
    "",
    "## Simulation Result",
    "",
    `- Total candidates: ${report.totalCandidates}`,
    `- Auto approve candidates: ${report.autoApproveCandidates.length}`,
    `- Review required candidates: ${report.reviewRequiredCandidates.length}`,
    `- Rejected candidates: ${report.rejectedCandidates.length}`,
    `- Average confidence: ${report.averageConfidence}`,
    `- Expected question increase from auto-approve candidates: ${report.promotionCoverageImpact.expectedQuestionIncrease}`,
    `- Expected coverage increase from auto-approve candidates: ${report.promotionCoverageImpact.expectedCoverageIncrease}`,
    `- Risk distribution: LOW ${report.riskDistribution.LOW}, MEDIUM ${report.riskDistribution.MEDIUM}, HIGH ${report.riskDistribution.HIGH}`,
    "",
    "## Human Review Boundary",
    "",
    "- AUTO_APPROVE_CANDIDATE is a classification only.",
    "- AtomicFact creation, KnowledgePack append, status changes, graph changes, question DB writes, and Supabase writes are intentionally not performed."
  ].join("\n") + "\n";
}
