import { describe, expect, it } from "vitest";
import type { CertificationAuthContext, CertificationRole } from "@/domain/certification-engine/auth/certification-auth";
import { executeCommand } from "./admin-operation-service";
import type { AdminCommand } from "./admin-operations";
import { prepareLearningAnalyticsView } from "./instructor-operation";
import { prepareFactReview, prepareGraphReview } from "./reviewer-workflow";

const scope = {
  domainId: "kr-drone-license",
  packId: "kr-drone-license:mrm0omvd"
};

function auth(role: CertificationRole): CertificationAuthContext {
  return {
    identity: { userId: `${role.toLowerCase()}-1`, status: "active" },
    roles: [role],
    permissions: [],
    scope
  };
}

function command(overrides: Partial<AdminCommand> = {}): AdminCommand {
  return {
    commandId: "cmd-1",
    actorId: "admin-1",
    role: "ADMIN",
    action: "MANAGE_PACK",
    targetType: "PACK",
    targetId: scope.packId,
    payload: {},
    createdAt: "2026-07-29T00:00:00.000Z",
    ...overrides
  };
}

describe("certification platform admin operations", () => {
  it("executes admin commands and returns audit structure without mutating data", () => {
    const result = executeCommand(command(), auth("ADMIN"), scope);

    expect(result).toMatchObject({
      success: true,
      commandId: "cmd-1",
      auditRecord: {
        commandId: "cmd-1",
        action: "MANAGE_PACK",
        targetType: "PACK",
        targetId: scope.packId,
        result: "success"
      }
    });
  });

  it("allows reviewer review workflows and blocks learner review commands", () => {
    expect(executeCommand(command({
      actorId: "reviewer-1",
      role: "REVIEWER",
      action: "REVIEW_FACT",
      targetType: "FACT",
      targetId: "AF-001"
    }), auth("REVIEWER"), scope).success).toBe(true);

    expect(executeCommand(command({
      actorId: "learner-1",
      role: "LEARNER",
      action: "REVIEW_GRAPH",
      targetType: "GRAPH",
      targetId: "REL-001"
    }), auth("LEARNER"), scope)).toMatchObject({
      success: false,
      auditRecord: { result: "failed" }
    });
  });

  it("validates required command fields", () => {
    expect(executeCommand(command({ commandId: "" }), auth("ADMIN"), scope)).toMatchObject({
      success: false,
      message: "commandId is required"
    });
  });

  it("prepares reviewer fact and graph queues only for review-capable roles", () => {
    const factQueue = prepareFactReview(auth("REVIEWER"), ["AF-001", "AF-002"]);
    expect(factQueue.allowed).toBe(true);
    expect(factQueue.queue).toHaveLength(2);
    expect(factQueue.queue[0]).toMatchObject({ targetType: "FACT", targetId: "AF-001", priority: 2 });
    expect(prepareGraphReview(auth("LEARNER"), ["REL-001"])).toMatchObject({
      allowed: false,
      queue: []
    });
  });

  it("prepares instructor analytics report view without write capabilities", () => {
    expect(prepareLearningAnalyticsView(auth("INSTRUCTOR"), {
      ...scope,
      reportId: "report-1"
    })).toMatchObject({
      allowed: true,
      reportId: "report-1"
    });
  });
});
