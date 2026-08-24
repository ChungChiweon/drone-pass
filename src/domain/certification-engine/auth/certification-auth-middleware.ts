import type { CertificationControllerRequest, CertificationControllerResponse } from "@/domain/certification-engine/api/certification-controller-types";
import { mapErrorResponse } from "@/domain/certification-engine/api/certification-response-mapper";
import { canAccess } from "./authorization-policy";
import type { CertificationAuthAction, CertificationAuthContext } from "./certification-auth";

export type CertificationAuthMiddlewareResult =
  | { ok: true; request: CertificationControllerRequest }
  | { ok: false; response: CertificationControllerResponse<never> };

export function authorizeCertificationRequest(
  request: CertificationControllerRequest,
  authContext: CertificationAuthContext
): CertificationAuthMiddlewareResult {
  if (!authContext.identity.userId || authContext.identity.userId !== request.userId) {
    return { ok: false, response: mapErrorResponse(request.requestId || "unknown", "AUTH_REQUIRED", "Authenticated identity is required") };
  }

  const result = canAccess(authContext, actionToAuthAction(request.action), {
    domainId: request.domainId,
    packId: request.packId,
    ownerId: ownerIdForRequest(request)
  });

  if (!result.allowed) {
    return { ok: false, response: mapErrorResponse(request.requestId, "ACCESS_DENIED", result.reason ?? "Access denied") };
  }

  return { ok: true, request };
}

function actionToAuthAction(action: CertificationControllerRequest["action"]): CertificationAuthAction {
  if (action === "UPDATE_PROGRESS") return "STUDY";
  if (action === "ACTIVATE_RUNTIME" || action === "RECORD_AUDIT") return "MANAGE_PACK";
  if (action === "GET_AUDIT_HISTORY") return "REVIEW";
  if (action === "GET_PROGRESS") return "STUDY";
  if (action.includes("GRAPH")) return "REVIEW";
  return "READ";
}

function ownerIdForRequest(request: CertificationControllerRequest) {
  if (request.action === "GET_PROGRESS" || request.action === "UPDATE_PROGRESS") {
    return request.userId;
  }
  return undefined;
}
