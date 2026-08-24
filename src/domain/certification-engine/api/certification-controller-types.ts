export type CertificationControllerAction =
  | "GET_DOMAIN"
  | "LIST_DOMAINS"
  | "GET_PACK"
  | "LIST_PACKS"
  | "GET_RUNTIME"
  | "ACTIVATE_RUNTIME"
  | "GET_PROGRESS"
  | "UPDATE_PROGRESS"
  | "GET_ACTIVE_GRAPH"
  | "GET_GRAPH_VERSION"
  | "RECORD_AUDIT"
  | "GET_AUDIT_HISTORY";

export type CertificationControllerRequest<TPayload = unknown> = {
  requestId: string;
  userId: string;
  domainId: string;
  packId: string;
  action: CertificationControllerAction;
  payload: TPayload;
};

export type CertificationApiErrorCode =
  | "AUTH_REQUIRED"
  | "ACCESS_DENIED"
  | "DOMAIN_NOT_FOUND"
  | "PACK_NOT_FOUND"
  | "RUNTIME_NOT_READY"
  | "VALIDATION_FAILED"
  | "INTERNAL_ERROR";

export type CertificationApiError = {
  code: CertificationApiErrorCode;
  message: string;
  details?: unknown;
};

export type CertificationControllerResponse<TData = unknown> = {
  success: boolean;
  requestId: string;
  data?: TData;
  error?: CertificationApiError;
};

export type CertificationController = {
  handle<TData = unknown, TPayload = unknown>(request: CertificationControllerRequest<TPayload>): Promise<CertificationControllerResponse<TData>>;
};
