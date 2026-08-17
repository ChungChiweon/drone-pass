import type { CertificationServices } from "@/domain/certification-engine/services/certification-services";
import { mapErrorResponse } from "./certification-response-mapper";
import type { CertificationControllerRequest, CertificationControllerResponse } from "./certification-controller-types";

export type CertificationMiddlewareResult =
  | { ok: true; request: CertificationControllerRequest }
  | { ok: false; response: CertificationControllerResponse<never> };

export function prepareCertificationRequest(request: CertificationControllerRequest): CertificationMiddlewareResult {
  if (!request.userId) {
    return { ok: false, response: mapErrorResponse(request.requestId || "unknown", "AUTH_REQUIRED", "userId is required") };
  }
  if (!request.requestId || !request.domainId || !request.packId || !request.action) {
    return { ok: false, response: mapErrorResponse(request.requestId || "unknown", "VALIDATION_FAILED", "requestId, domainId, packId, and action are required") };
  }
  return { ok: true, request };
}

export async function validateControllerResourceAccess(
  request: CertificationControllerRequest,
  services: CertificationServices
): Promise<CertificationControllerResponse<never> | null> {
  if (request.action === "GET_DOMAIN" || request.action === "LIST_PACKS") {
    const domain = await services.domainService.getDomain(request.domainId);
    return domain ? null : mapErrorResponse(request.requestId, "DOMAIN_NOT_FOUND", `Domain not found: ${request.domainId}`);
  }
  if (request.action === "GET_PACK" || request.action === "GET_PROGRESS" || request.action === "GET_ACTIVE_GRAPH") {
    const pack = await services.packService.getPack(request.packId);
    return pack ? null : mapErrorResponse(request.requestId, "PACK_NOT_FOUND", `Pack not found: ${request.packId}`);
  }
  return null;
}
