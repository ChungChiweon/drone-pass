import type { CertificationAuditRecord } from "@/domain/certification-engine/backend-model/certification-backend-model";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationServices } from "@/domain/certification-engine/services/certification-services";
import { prepareCertificationRequest, validateControllerResourceAccess } from "./certification-api-middleware";
import type { CertificationControllerRequest, CertificationControllerResponse } from "./certification-controller-types";
import { mapErrorResponse, mapSuccessResponse, mapUnknownError } from "./certification-response-mapper";

export async function handleCertificationRequest<TData = unknown, TPayload = unknown>(
  request: CertificationControllerRequest<TPayload>,
  services: CertificationServices
): Promise<CertificationControllerResponse<TData>> {
  const prepared = prepareCertificationRequest(request);
  if (!prepared.ok) return prepared.response;

  try {
    const resourceError = await validateControllerResourceAccess(prepared.request, services);
    if (resourceError) return resourceError;

    const data = await dispatchCertificationAction(prepared.request, services);
    return mapSuccessResponse(prepared.request.requestId, data) as CertificationControllerResponse<TData>;
  } catch (error) {
    return mapControllerError(prepared.request.requestId, error);
  }
}

async function dispatchCertificationAction(request: CertificationControllerRequest, services: CertificationServices) {
  switch (request.action) {
    case "GET_DOMAIN": {
      const domain = await services.domainService.getDomain(request.domainId);
      if (!domain) throw new ControllerMappedError("DOMAIN_NOT_FOUND", `Domain not found: ${request.domainId}`);
      return domain;
    }
    case "LIST_DOMAINS":
      return services.domainService.listDomains();
    case "GET_PACK": {
      const pack = await services.packService.getPack(request.packId);
      if (!pack) throw new ControllerMappedError("PACK_NOT_FOUND", `Pack not found: ${request.packId}`);
      return pack;
    }
    case "LIST_PACKS":
      return services.packService.listPacks(request.domainId);
    case "GET_RUNTIME": {
      const runtimeId = getStringPayloadValue(request.payload, "runtimeId");
      const runtime = await services.runtimeService.getRuntime(runtimeId);
      if (!runtime) throw new ControllerMappedError("RUNTIME_NOT_READY", `Runtime not ready: ${runtimeId}`);
      return runtime;
    }
    case "ACTIVATE_RUNTIME": {
      const runtimeId = getStringPayloadValue(request.payload, "runtimeId");
      const runtime = await services.runtimeService.activateRuntime(runtimeId);
      if (!runtime) throw new ControllerMappedError("RUNTIME_NOT_READY", `Runtime not ready: ${runtimeId}`);
      return runtime;
    }
    case "GET_PROGRESS":
      return services.progressService.getProgress(request.userId, request.packId);
    case "UPDATE_PROGRESS":
      return services.progressService.updateProgress(assertPayloadObject<CertificationProgressContext>(request.payload, "progress context"));
    case "GET_ACTIVE_GRAPH":
      return services.graphService.getActiveGraph(request.packId);
    case "GET_GRAPH_VERSION":
      return services.graphService.getGraphVersion(getStringPayloadValue(request.payload, "versionId"));
    case "RECORD_AUDIT":
      return services.auditService.recordAudit(assertPayloadObject<CertificationAuditRecord>(request.payload, "audit record"));
    case "GET_AUDIT_HISTORY":
      return services.auditService.getAuditHistory(getStringPayloadValue(request.payload, "entityId"));
    default:
      return exhaustiveAction(request.action);
  }
}

function assertPayloadObject<TPayload>(payload: unknown, label: string): TPayload {
  if (!payload || typeof payload !== "object") {
    throw new ControllerMappedError("VALIDATION_FAILED", `Valid ${label} payload is required`);
  }
  return payload as TPayload;
}

function getStringPayloadValue(payload: unknown, key: string) {
  const value = (assertPayloadObject<Record<string, unknown>>(payload, key)[key]);
  if (typeof value !== "string" || !value) {
    throw new ControllerMappedError("VALIDATION_FAILED", `${key} is required`);
  }
  return value;
}

function exhaustiveAction(action: never): never {
  throw new ControllerMappedError("VALIDATION_FAILED", `Unsupported action: ${String(action)}`);
}

class ControllerMappedError extends Error {
  constructor(
    readonly code: "DOMAIN_NOT_FOUND" | "PACK_NOT_FOUND" | "RUNTIME_NOT_READY" | "VALIDATION_FAILED",
    message: string
  ) {
    super(message);
  }
}

export function mapControllerError(requestId: string, error: unknown) {
  if (error instanceof ControllerMappedError) {
    return mapErrorResponse(requestId, error.code, error.message);
  }
  return mapUnknownError(requestId, error);
}
