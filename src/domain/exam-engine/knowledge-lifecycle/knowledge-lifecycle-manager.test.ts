import { describe, expect, it } from "vitest";
import type { AtomicFact, Concept, GeneratedQuestion, KnowledgeRelation } from "@/domain/exam-engine/types";
import { analyzeFactImpact } from "./fact-impact-analyzer";
import { createDeprecationRecord, createKnowledgeLifecycleManager, createVersionPreview, getFactLifecycle } from "./knowledge-lifecycle-manager";

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
    confidence: 0.8,
    version: "1",
    status: "approved",
    ...overrides
  };
}

function relation(id: string, toFactId: string): KnowledgeRelation {
  return {
    id,
    packId: "pack",
    fromFactId: "AF-001",
    toFactId,
    relationType: "RELATED",
    reason: "impact",
    confidence: 0.8,
    createdAt: "2026-07-28T00:00:00.000Z",
    reviewStatus: "approved"
  };
}

function question(id: string, factId = "AF-001"): GeneratedQuestion {
  return {
    id,
    examId: "exam",
    subjectId: "S-1",
    categoryIds: ["CAT-1"],
    conceptIds: ["C-1"],
    factIds: [factId],
    templateId: "TPL",
    stem: "stem",
    choices: [{ id: "A", text: "choice", isCorrect: true, sourceFactIds: [factId] }],
    explanation: "explanation",
    difficulty: "medium",
    sourceReferences: [sourceReference],
    generatedAt: "2026-07-28T00:00:00.000Z",
    generationSeed: "seed",
    validationStatus: "valid",
    trace: { factId, templateId: "TPL", questionType: "SELECT_TRUE", distractorRuleIds: [] }
  };
}

const concepts: Concept[] = [{ id: "C-1", subjectId: "S-1", categoryIds: ["CAT-1"], title: "신고", summary: "" }];

describe("knowledge lifecycle manager", () => {
  it("creates lifecycle state from an existing fact without mutation", () => {
    const original = fact();
    const before = JSON.stringify(original);

    expect(getFactLifecycle("AF-001", [original])).toMatchObject({
      factId: "AF-001",
      currentVersion: "1",
      status: "active"
    });
    expect(JSON.stringify(original)).toBe(before);
  });

  it("creates version preview without updating the fact", () => {
    const original = fact();
    const preview = createVersionPreview(original, {
      statement: "초경량비행장치 중 일부는 신고하여야 한다",
      changeReason: "법령 개정",
      createdAt: "2026-07-28T01:00:00.000Z"
    });

    expect(preview.previousStatement).toBe(original.statement);
    expect(preview.nextVersion).toMatchObject({
      versionId: "AF-001:v2",
      sourceReference,
      changeReason: "법령 개정"
    });
    expect(original.statement).toBe("초경량비행장치는 신고하여야 한다");
  });

  it("analyzes low and high impact updates", () => {
    expect(analyzeFactImpact("AF-001", [], [], concepts).riskLevel).toBe("low");
    const high = analyzeFactImpact("AF-001", [
      relation("R1", "AF-002"),
      relation("R2", "AF-003"),
      relation("R3", "AF-004")
    ], [question("Q1"), question("Q2"), question("Q3"), question("Q4")], concepts);

    expect(high.affectedRelations).toHaveLength(3);
    expect(high.affectedQuestions).toHaveLength(4);
    expect(high.affectedConcepts).toEqual(["C-1"]);
    expect(high.riskLevel).toBe("high");
  });

  it("provides manager methods for lifecycle, version preview, and impact preview", () => {
    const manager = createKnowledgeLifecycleManager({
      facts: [fact()],
      relations: [relation("R1", "AF-002")],
      questions: [question("Q1")],
      concepts
    });

    expect(manager.getFactLifecycle("AF-001")?.status).toBe("active");
    expect(manager.createVersionPreview(fact(), { statement: "변경", changeReason: "테스트" }).nextStatement).toBe("변경");
    expect(manager.analyzeUpdateImpact("AF-001").riskLevel).toBe("medium");
  });

  it("creates deprecation records for future law changes", () => {
    expect(createDeprecationRecord("AF-001", "법령 개정", "AF-500", "2026-07-28T00:00:00.000Z")).toEqual({
      factId: "AF-001",
      reason: "법령 개정",
      replacedByFactId: "AF-500",
      createdAt: "2026-07-28T00:00:00.000Z"
    });
  });
});
