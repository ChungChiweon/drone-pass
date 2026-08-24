import { describe, expect, it } from "vitest";
import { handleCertificationRequest } from "./certification-controller";
import { createCertificationApiError, mapErrorResponse, mapSuccessResponse } from "./certification-response-mapper";
import type { CertificationServices } from "@/domain/certification-engine/services/certification-services";

const baseRequest = {
  requestId: "req-1",
  userId: "user-1",
  domainId: "kr-drone-license",
  packId: "kr-drone-license:mrm0omvd"
};

function services(overrides: Partial<CertificationServices> = {}): CertificationServices {
  return {
    domainService: {
      async getDomain(domainId) {
        return domainId === "missing" ? null : { domainId, name: "Drone Pass", description: "Drone certification", version: "1", status: "active" };
      },
      async listDomains() {
        return [{ domainId: "kr-drone-license", name: "Drone Pass", description: "Drone certification", version: "1", status: "active" }];
      }
    },
    packService: {
      async getPack(packId) {
        return packId === "missing-pack" ? null : { packId, domainId: "kr-drone-license", name: "Drone Pack", version: "1", status: "active", createdAt: "2026-07-29T00:00:00.000Z" };
      },
      async listPacks(domainId) {
        return [{ packId: "kr-drone-license:mrm0omvd", domainId, name: "Drone Pack", version: "1", status: "active", createdAt: "2026-07-29T00:00:00.000Z" }];
      }
    },
    runtimeService: {
      async getRuntime(runtimeId) {
        return runtimeId === "ready-runtime" ? ({ status: "ready", packDescriptor: { packId: "kr-drone-license:mrm0omvd" } } as never) : null;
      },
      async activateRuntime(runtimeId) {
        return runtimeId === "ready-runtime" ? ({ status: "ready", packDescriptor: { packId: "kr-drone-license:mrm0omvd" } } as never) : null;
      }
    },
    progressService: {
      async getProgress(userId, packId) {
        return { userId, domainId: "kr-drone-license", packId, runtimeId: "ready-runtime", learnerStates: [], analytics: {} as never, adaptiveState: {} as never, tutorState: {} as never };
      },
      async updateProgress(context) {
        return context;
      }
    },
    graphService: {
      async getActiveGraph(packId) {
        return { id: "graph-1", domainId: "kr-drone-license", packId, versionId: "kg-v1", relations: [], status: "active", createdAt: "2026-07-29T00:00:00.000Z" };
      },
      async getGraphVersion(versionId) {
        return { id: "graph-1", domainId: "kr-drone-license", packId: "kr-drone-license:mrm0omvd", versionId, relations: [], status: "active", createdAt: "2026-07-29T00:00:00.000Z" };
      }
    },
    auditService: {
      async recordAudit(record) {
        return record;
      },
      async getAuditHistory(entityId) {
        return [{ id: "audit-1", entityType: "PROGRESS", entityId, action: "UPDATE", userId: "user-1", beforeState: null, afterState: null, createdAt: "2026-07-29T00:00:00.000Z" }];
      }
    },
    ...overrides
  };
}

describe("certification API controller", () => {
  it("handles a normal controller request", async () => {
    await expect(handleCertificationRequest({
      ...baseRequest,
      action: "GET_PACK",
      payload: {}
    }, services())).resolves.toMatchObject({
      success: true,
      requestId: "req-1",
      data: { packId: "kr-drone-license:mrm0omvd" }
    });
  });

  it("returns validation errors before service dispatch", async () => {
    await expect(handleCertificationRequest({
      ...baseRequest,
      requestId: "",
      action: "GET_PACK",
      payload: {}
    }, services())).resolves.toMatchObject({
      success: false,
      requestId: "unknown",
      error: { code: "VALIDATION_FAILED" }
    });
  });

  it("maps access denied service errors", async () => {
    await expect(handleCertificationRequest({
      ...baseRequest,
      action: "GET_DOMAIN",
      payload: {}
    }, services({
      domainService: {
        async getDomain() {
          throw new Error("Missing READ permission");
        },
        async listDomains() {
          return [];
        }
      }
    }))).resolves.toMatchObject({
      success: false,
      error: { code: "ACCESS_DENIED" }
    });
  });

  it("maps service not-found and runtime-not-ready results", async () => {
    await expect(handleCertificationRequest({
      ...baseRequest,
      packId: "missing-pack",
      action: "GET_PACK",
      payload: {}
    }, services())).resolves.toMatchObject({
      success: false,
      error: { code: "PACK_NOT_FOUND" }
    });

    await expect(handleCertificationRequest({
      ...baseRequest,
      action: "GET_RUNTIME",
      payload: { runtimeId: "cold-runtime" }
    }, services())).resolves.toMatchObject({
      success: false,
      error: { code: "RUNTIME_NOT_READY" }
    });
  });

  it("keeps response mapper output stable", () => {
    expect(mapSuccessResponse("req-1", { ok: true })).toEqual({ success: true, requestId: "req-1", data: { ok: true } });
    expect(mapErrorResponse("req-1", "ACCESS_DENIED", "blocked")).toEqual({
      success: false,
      requestId: "req-1",
      error: createCertificationApiError("ACCESS_DENIED", "blocked")
    });
  });
});
