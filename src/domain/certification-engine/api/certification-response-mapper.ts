import type { CertificationApiError, CertificationApiErrorCode, CertificationControllerResponse } from "./certification-controller-types";

export function mapSuccessResponse<TData>(requestId: string, data: TData): CertificationControllerResponse<TData> {
  return {
    success: true,
    requestId,
    data
  };
}

export function mapErrorResponse(
  requestId: string,
  code: CertificationApiErrorCode,
  message: string,
  details?: unknown
): CertificationControllerResponse<never> {
  return {
    success: false,
    requestId,
    error: createCertificationApiError(code, message, details)
  };
}

export function createCertificationApiError(
  code: CertificationApiErrorCode,
  message: string,
  details?: unknown
): CertificationApiError {
  return details === undefined ? { code, message } : { code, message, details };
}

export function mapUnknownError(requestId: string, error: unknown): CertificationControllerResponse<never> {
  const message = error instanceof Error ? error.message : "Unknown certification controller error";
  const code = message.includes("Missing") || message.includes("mismatch") || message.includes("denied") ? "ACCESS_DENIED" : "INTERNAL_ERROR";
  return mapErrorResponse(requestId, code, message);
}
