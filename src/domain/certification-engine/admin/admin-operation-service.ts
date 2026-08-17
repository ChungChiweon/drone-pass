import type { CertificationAuthAction, CertificationAuthContext, CertificationResourceScope } from "@/domain/certification-engine/auth/certification-auth";
import { canAccess } from "@/domain/certification-engine/auth/authorization-policy";
import type { AdminCommand, AdminCommandAction, AdminOperationResult } from "./admin-operations";

export function executeCommand(
  command: AdminCommand,
  authContext: CertificationAuthContext,
  resource: CertificationResourceScope = {
    domainId: authContext.scope?.domainId ?? "",
    packId: authContext.scope?.packId ?? ""
  }
): AdminOperationResult {
  const validationError = validateCommand(command);
  if (validationError) {
    return createResult(command, false, validationError);
  }

  const access = canAccess(authContext, actionToPolicyAction(command.action), resource);
  if (!access.allowed) {
    return createResult(command, false, access.reason ?? "Access denied");
  }

  return createResult(command, true, `Command ${command.action} prepared for ${command.targetType}:${command.targetId}`);
}

function validateCommand(command: AdminCommand) {
  if (!command.commandId) return "commandId is required";
  if (!command.actorId) return "actorId is required";
  if (!command.action) return "action is required";
  if (!command.targetType) return "targetType is required";
  if (!command.targetId) return "targetId is required";
  if (!command.createdAt) return "createdAt is required";
  return null;
}

function actionToPolicyAction(action: AdminCommandAction): CertificationAuthAction {
  if (action === "MANAGE_PACK" || action === "APPROVE_CONTENT" || action === "REJECT_CONTENT") return "MANAGE_PACK";
  if (action === "REVIEW_FACT" || action === "REVIEW_GRAPH") return "REVIEW";
  return "READ";
}

function createResult(command: AdminCommand, success: boolean, message: string): AdminOperationResult {
  return {
    success,
    commandId: command.commandId,
    message,
    auditRecord: {
      commandId: command.commandId,
      actorId: command.actorId,
      action: command.action,
      targetType: command.targetType,
      targetId: command.targetId,
      result: success ? "success" : "failed",
      timestamp: new Date().toISOString()
    }
  };
}
