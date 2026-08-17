import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import { createFactChangeEvent, createPropagationTasks, calculateChangePriority } from "./change-propagation-engine";
import type { FactImpactReport } from "./knowledge-lifecycle";

function impact(overrides: Partial<FactImpactReport> = {}): FactImpactReport {
  return {
    factId: "AF-001",
    affectedRelations: ["REL-1"],
    affectedQuestions: ["Q-1"],
    affectedConcepts: ["C-1"],
    examScore: 0.5,
    riskLevel: "medium",
    ...overrides
  };
}

function fact(): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-1",
    subject: "장치",
    predicate: "신고",
    value: "신고",
    statement: "초경량비행장치는 신고하여야 한다",
    conditions: [],
    exceptions: [],
    sourceReferences: [{ documentId: "law", revisionId: "rev-1", locator: "제1조" }],
    version: "1",
    status: "approved"
  };
}

describe("change propagation engine", () => {
  it("creates fact update events", () => {
    expect(createFactChangeEvent({
      eventId: "EV-1",
      factId: "AF-001",
      previousVersion: "v1",
      nextVersion: "v2",
      changeType: "UPDATE",
      createdAt: "2026-07-28T00:00:00.000Z"
    })).toEqual({
      eventId: "EV-1",
      factId: "AF-001",
      previousVersion: "v1",
      nextVersion: "v2",
      changeType: "UPDATE",
      createdAt: "2026-07-28T00:00:00.000Z"
    });
  });

  it("detects high priority numeric, penalty, and mandatory changes", () => {
    const event = createFactChangeEvent({ eventId: "EV-1", factId: "AF-001", previousVersion: "v1", nextVersion: "v2", changeType: "UPDATE" });

    expect(calculateChangePriority(event, impact({ riskLevel: "low" }), { previousStatement: "12kg", nextStatement: "25kg" })).toBe("high");
    expect(calculateChangePriority(event, impact({ riskLevel: "low" }), { changeReason: "벌칙 변경" })).toBe("high");
    expect(calculateChangePriority(event, impact({ riskLevel: "low" }), { nextStatement: "신고하여야 한다" })).toBe("high");
  });

  it("creates propagation tasks for relations, questions, concepts, exam score, and adaptive rules", () => {
    const event = createFactChangeEvent({ eventId: "EV-1", factId: "AF-001", previousVersion: "v1", nextVersion: "v2", changeType: "UPDATE" });
    const result = createPropagationTasks(event, impact({
      affectedRelations: ["REL-1", "REL-2"],
      affectedQuestions: ["Q-1", "Q-2"],
      affectedConcepts: ["C-1"]
    }), { nextStatement: "설명 문구 변경" });

    expect(result.tasks.map((task) => task.targetType)).toEqual(["RELATION", "RELATION", "QUESTION", "QUESTION", "CONCEPT", "EXAM_SCORE", "ADAPTIVE_RULE"]);
    expect(result.tasks.every((task) => task.status === "pending")).toBe(true);
    expect(result.tasks.find((task) => task.targetType === "QUESTION")?.targetId).toBe("Q-1");
  });

  it("creates rebuild candidates from propagation tasks", () => {
    const event = createFactChangeEvent({ eventId: "EV-1", factId: "AF-001", previousVersion: "v1", nextVersion: "v2", changeType: "REPLACE" });
    const result = createPropagationTasks(event, impact());

    expect(result.rebuildCandidates).toHaveLength(result.tasks.length);
    expect(result.rebuildCandidates.find((candidate) => candidate.targetType === "QUESTION")).toMatchObject({
      targetId: "Q-1",
      priority: "high",
      dependencies: ["AF-001", "v2"]
    });
  });

  it("does not mutate existing facts", () => {
    const existing = fact();
    const before = JSON.stringify(existing);
    const event = createFactChangeEvent({ eventId: "EV-1", factId: existing.id, previousVersion: existing.version, nextVersion: "v2", changeType: "UPDATE" });
    createPropagationTasks(event, impact());

    expect(JSON.stringify(existing)).toBe(before);
  });
});
