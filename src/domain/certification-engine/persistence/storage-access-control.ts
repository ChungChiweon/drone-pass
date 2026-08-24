import type { BackendStorageContext, BackendStoragePermission } from "./backend-certification-storage";
import type { CertificationStorageRecord } from "./certification-storage";

export type StorageAccessAction = "READ" | "WRITE" | "DELETE";

export type StorageAccessResult = {
  allowed: boolean;
  reason?: string;
};

const REQUIRED_PERMISSION_BY_ACTION: Record<StorageAccessAction, BackendStoragePermission> = {
  READ: "READ",
  WRITE: "WRITE",
  DELETE: "ADMIN"
};

export function validateStorageAccess(
  context: BackendStorageContext,
  action: StorageAccessAction,
  record?: Pick<CertificationStorageRecord, "domainId" | "packId" | "userId">
): StorageAccessResult {
  const requiredPermission = REQUIRED_PERMISSION_BY_ACTION[action];
  if (!hasPermission(context, requiredPermission)) {
    return { allowed: false, reason: `Missing ${requiredPermission} permission` };
  }
  if (record?.domainId && record.domainId !== context.domainId) {
    return { allowed: false, reason: "Domain mismatch" };
  }
  if (record?.packId && record.packId !== context.packId) {
    return { allowed: false, reason: "Pack mismatch" };
  }
  if (record?.userId && record.userId !== context.userId && !hasPermission(context, "ADMIN")) {
    return { allowed: false, reason: "User mismatch" };
  }
  return { allowed: true };
}

export function assertStorageAccess(
  context: BackendStorageContext,
  action: StorageAccessAction,
  record?: Pick<CertificationStorageRecord, "domainId" | "packId" | "userId">
) {
  const result = validateStorageAccess(context, action, record);
  if (!result.allowed) {
    throw new Error(result.reason ?? "Storage access denied");
  }
}

function hasPermission(context: BackendStorageContext, permission: BackendStoragePermission) {
  return context.permissions.includes("ADMIN") || context.permissions.includes(permission);
}
