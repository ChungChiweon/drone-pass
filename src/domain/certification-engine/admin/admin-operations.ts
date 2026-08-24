import type { CertificationRole } from "@/domain/certification-engine/auth/certification-auth";

export type AdminCommandAction =
  | "REVIEW_FACT"
  | "REVIEW_GRAPH"
  | "APPROVE_CONTENT"
  | "REJECT_CONTENT"
  | "MANAGE_PACK"
  | "VIEW_ANALYTICS";

export type AdminCommandTargetType = "FACT" | "GRAPH" | "PACK" | "USER" | "REPORT";

export type AdminCommand<TPayload = unknown> = {
  commandId: string;
  actorId: string;
  role: CertificationRole;
  action: AdminCommandAction;
  targetType: AdminCommandTargetType;
  targetId: string;
  payload: TPayload;
  createdAt: string;
};

export type AdminAuditRecord = {
  commandId: string;
  actorId: string;
  action: AdminCommandAction;
  targetType: AdminCommandTargetType;
  targetId: string;
  result: "success" | "failed";
  timestamp: string;
};

export type AdminOperationResult = {
  success: boolean;
  commandId: string;
  message: string;
  auditRecord: AdminAuditRecord;
};
