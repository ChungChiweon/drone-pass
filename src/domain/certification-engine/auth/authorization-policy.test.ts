import { describe, expect, it } from "vitest";
import { authorizeCertificationRequest } from "./certification-auth-middleware";
import type { CertificationAuthContext } from "./certification-auth";
import { canAccess, permissionsForRoles } from "./authorization-policy";
import type { CertificationControllerRequest } from "@/domain/certification-engine/api/certification-controller-types";

const resource = {
  domainId: "kr-drone-license",
  packId: "kr-drone-license:mrm0omvd"
};

function context(overrides: Partial<CertificationAuthContext> = {}): CertificationAuthContext {
  return {
    identity: { userId: "user-1", email: "user@example.com", displayName: "User", status: "active" },
    roles: ["LEARNER"],
    permissions: [],
    scope: resource,
    ...overrides
  };
}

function request(action: CertificationControllerRequest["action"]): CertificationControllerRequest {
  return {
    requestId: "req-1",
    userId: "user-1",
    domainId: resource.domainId,
    packId: resource.packId,
    action,
    payload: {}
  };
}

describe("certification authorization architecture", () => {
  it("grants learner study and exam permissions but blocks review", () => {
    expect(canAccess(context(), "STUDY", resource).allowed).toBe(true);
    expect(canAccess(context(), "EXAM", resource).allowed).toBe(true);
    expect(canAccess(context(), "REVIEW", resource)).toMatchObject({
      allowed: false,
      reason: "Missing REVIEW permission"
    });
  });

  it("grants reviewer review permission without pack management", () => {
    const reviewer = context({ roles: ["REVIEWER"], permissions: [], scope: resource });

    expect(canAccess(reviewer, "REVIEW", resource).allowed).toBe(true);
    expect(canAccess(reviewer, "MANAGE_PACK", resource).allowed).toBe(false);
  });

  it("grants admin all permissions and cross-owner access", () => {
    const admin = context({ roles: ["ADMIN"], permissions: [], identity: { userId: "admin-1", status: "active" } });

    expect(permissionsForRoles(["ADMIN"])).toContain("MANAGE_USER");
    expect(canAccess(admin, "ADMIN", { ...resource, ownerId: "user-2" }).allowed).toBe(true);
  });

  it("blocks suspended users and scope mismatches", () => {
    expect(canAccess(context({ identity: { userId: "user-1", status: "suspended" } }), "READ", resource).reason).toBe("User is suspended");
    expect(canAccess(context({ scope: { domainId: "boat-license", packId: resource.packId } }), "READ", resource).reason).toBe("Domain mismatch");
    expect(canAccess(context({ scope: { domainId: resource.domainId, packId: "other-pack" } }), "READ", resource).reason).toBe("Pack mismatch");
  });

  it("authorizes controller requests before the controller boundary", () => {
    expect(authorizeCertificationRequest(request("GET_PROGRESS"), context())).toMatchObject({ ok: true });
    expect(authorizeCertificationRequest(request("GET_ACTIVE_GRAPH"), context())).toMatchObject({
      ok: false,
      response: { error: { code: "ACCESS_DENIED" } }
    });
    expect(authorizeCertificationRequest(request("GET_PROGRESS"), context({ identity: { userId: "other-user", status: "active" } }))).toMatchObject({
      ok: false,
      response: { error: { code: "AUTH_REQUIRED" } }
    });
  });
});
