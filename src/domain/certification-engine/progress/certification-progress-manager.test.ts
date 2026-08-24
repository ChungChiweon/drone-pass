import { describe, expect, it } from "vitest";
import type { AtomicFact } from "@/domain/exam-engine/types";
import type { LearnerKnowledgeState } from "@/domain/exam-engine/adaptive/learner-state";
import { DRONE_CERTIFICATION_DOMAIN, type CertificationDomain, type CertificationExamConfig, type CertificationPack, type CertificationPackDescriptor, type CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import { adaptProgressToAdaptiveContext, adaptProgressToTutorContext } from "./certification-progress-adapter";
import { CertificationProgressManager } from "./certification-progress-manager";
import { validateProgressIsolation } from "./progress-isolation-validator";

const examConfig: CertificationExamConfig = {
  examId: "basic",
  examSize: 40,
  passingScore: 70,
  difficultyDistribution: { easy: 0.3, medium: 0.5, hard: 0.2 },
  categoryDistribution: []
};

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
    sourceReferences: [{ documentId: "law", locator: "제1조" }],
    version: "1",
    status: "approved"
  };
}

function runtime(domain: CertificationDomain = DRONE_CERTIFICATION_DOMAIN, packId = "drone-pack"): CertificationRuntimeContext {
  const pack: CertificationPack = { domainId: domain.domainId, packId, sourceDocuments: [], concepts: [], facts: [fact()], questionTemplates: [], examBlueprints: [] };
  const descriptor: CertificationPackDescriptor = { packId, domainId: domain.domainId, name: packId, version: "1", status: "active", createdAt: "2026-07-28T00:00:00.000Z" };
  const version: CertificationPackVersion = { packId, version: "1", sourceRevision: "rev-1", createdAt: "2026-07-28T00:00:00.000Z", status: "active" };
  return {
    status: "ready",
    domain,
    packDescriptor: descriptor,
    packVersion: version,
    pack,
    knowledgeGraph: { relations: [] },
    examConfig,
    learnerConfig: { masteryThreshold: 0.8, reviewIntervalDays: 7 }
  };
}

function learnerState(packId = "drone-pack"): LearnerKnowledgeState {
  return {
    learnerId: "user-1",
    packId,
    factId: "AF-001",
    masteryScore: 0.4,
    confidenceScore: 0.5,
    attemptCount: 3,
    correctCount: 1,
    wrongCount: 2,
    wrongPatternTags: ["numeric"],
    lastReviewedAt: "2026-07-28T00:00:00.000Z",
    nextReviewAt: null,
    learningStatus: "review_needed"
  };
}

describe("certification progress isolation", () => {
  it("keeps multiple certification progress contexts for one user separated", () => {
    const boatDomain: CertificationDomain = { domainId: "kr-boat-license", name: "Boat", description: "Boat", version: "1", status: "active" };
    const manager = new CertificationProgressManager();
    const droneProgress = manager.createProgressContext({ userId: "user-1", runtime: runtime(), context: { learnerStates: [learnerState()] } });
    const boatProgress = manager.createProgressContext({ userId: "user-1", runtime: runtime(boatDomain, "boat-pack"), context: { learnerStates: [learnerState("boat-pack")] } });

    expect(droneProgress.packId).toBe("drone-pack");
    expect(boatProgress.packId).toBe("boat-pack");
    expect(manager.getProgressContext({ userId: "user-1", certificationId: "kr-drone-license", packId: "drone-pack" })?.learnerStates[0].packId).toBe("drone-pack");
    expect(manager.getProgressContext({ userId: "user-1", certificationId: "kr-boat-license", packId: "boat-pack" })?.learnerStates[0].packId).toBe("boat-pack");
  });

  it("switches runtime progress without overwriting another certification", () => {
    const boatDomain: CertificationDomain = { domainId: "kr-boat-license", name: "Boat", description: "Boat", version: "1", status: "active" };
    const manager = new CertificationProgressManager();
    manager.createProgressContext({ userId: "user-1", runtime: runtime(), context: { tutorState: { weakFacts: ["AF-001"], learningHistory: ["Q-1"], recommendedReviewFacts: ["AF-001"] } } });

    const boat = manager.switchCertificationProgress("user-1", runtime(boatDomain, "boat-pack"));
    const drone = manager.switchCertificationProgress("user-1", runtime());

    expect(boat.packId).toBe("boat-pack");
    expect(drone.tutorState.learningHistory).toEqual(["Q-1"]);
  });

  it("validates user, domain, pack, and runtime isolation", () => {
    const manager = new CertificationProgressManager();
    const progress = manager.createProgressContext({ userId: "user-1", runtime: runtime() });

    expect(validateProgressIsolation({ expectedUserId: "user-1", runtime: runtime(), progress }).valid).toBe(true);
    expect(validateProgressIsolation({ expectedUserId: "user-2", runtime: runtime(), progress }).errors).toEqual(expect.arrayContaining(["user mismatch: user-2 !== user-1"]));
    expect(validateProgressIsolation({ expectedUserId: "user-1", runtime: runtime({ ...DRONE_CERTIFICATION_DOMAIN, domainId: "other" }), progress }).errors.join("; ")).toContain("domain mismatch");
    expect(validateProgressIsolation({ expectedUserId: "user-1", runtime: runtime(DRONE_CERTIFICATION_DOMAIN, "other-pack"), progress }).errors.join("; ")).toContain("pack mismatch");
  });

  it("adapts progress into adaptive and tutor contexts", () => {
    const progress = new CertificationProgressManager().createProgressContext({
      userId: "user-1",
      runtime: runtime(),
      context: {
        learnerStates: [learnerState()],
        adaptiveState: { recommendations: [{ factId: "AF-001", priorityScore: 0.9, reason: "weak" }], lastCalculatedAt: "2026-07-28T00:00:00.000Z" },
        tutorState: { weakFacts: ["AF-001"], learningHistory: ["Q-1"], recommendedReviewFacts: ["AF-002"] }
      }
    });

    expect(adaptProgressToAdaptiveContext(progress).adaptiveRecommendation[0].factId).toBe("AF-001");
    expect(adaptProgressToTutorContext(progress)).toMatchObject({
      weakFacts: ["AF-001"],
      learningHistory: ["Q-1"],
      recommendedReviewFacts: ["AF-002"]
    });
  });

  it("does not mutate existing learner state through manager or adapters", () => {
    const state = learnerState();
    const before = JSON.stringify(state);
    const manager = new CertificationProgressManager();
    const progress = manager.createProgressContext({ userId: "user-1", runtime: runtime(), context: { learnerStates: [state] } });
    adaptProgressToAdaptiveContext(progress).learnerStates[0].wrongPatternTags.push("changed");
    manager.getProgressContext({ userId: "user-1", certificationId: "kr-drone-license", packId: "drone-pack" })?.learnerStates[0].wrongPatternTags.push("changed");

    expect(JSON.stringify(state)).toBe(before);
  });
});
