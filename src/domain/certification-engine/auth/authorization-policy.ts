import type { AuthorizationResult, CertificationAuthAction, CertificationAuthContext, CertificationPermission, CertificationResourceScope, CertificationRole } from "./certification-auth";

const ROLE_PERMISSIONS: Record<CertificationRole, CertificationPermission[]> = {
  LEARNER: ["READ", "STUDY", "EXAM"],
  INSTRUCTOR: ["READ", "STUDY", "EXAM", "REVIEW"],
  REVIEWER: ["READ", "REVIEW"],
  ADMIN: ["READ", "STUDY", "EXAM", "REVIEW", "MANAGE_PACK", "MANAGE_USER", "ADMIN"]
};

const ACTION_PERMISSION: Record<CertificationAuthAction, CertificationPermission> = {
  READ: "READ",
  STUDY: "STUDY",
  EXAM: "EXAM",
  REVIEW: "REVIEW",
  MANAGE_PACK: "MANAGE_PACK",
  MANAGE_USER: "MANAGE_USER",
  ADMIN: "ADMIN"
};

export function canAccess(
  context: CertificationAuthContext,
  action: CertificationAuthAction,
  resource: CertificationResourceScope
): AuthorizationResult {
  if (context.identity.status !== "active") {
    return { allowed: false, reason: `User is ${context.identity.status}` };
  }
  if (!hasPermission(context, ACTION_PERMISSION[action])) {
    return { allowed: false, reason: `Missing ${ACTION_PERMISSION[action]} permission` };
  }
  if (!matchesScope(context.scope?.domainId, resource.domainId)) {
    return { allowed: false, reason: "Domain mismatch" };
  }
  if (!matchesScope(context.scope?.packId, resource.packId)) {
    return { allowed: false, reason: "Pack mismatch" };
  }
  if (resource.ownerId && resource.ownerId !== context.identity.userId && !hasPermission(context, "ADMIN") && !hasPermission(context, "MANAGE_USER")) {
    return { allowed: false, reason: "Owner mismatch" };
  }
  return { allowed: true };
}

export function permissionsForRoles(roles: CertificationRole[]) {
  return Array.from(new Set(roles.flatMap((role) => ROLE_PERMISSIONS[role]))).sort();
}

function hasPermission(context: CertificationAuthContext, permission: CertificationPermission) {
  return context.permissions.includes("ADMIN") || context.permissions.includes(permission) || permissionsForRoles(context.roles).includes(permission);
}

function matchesScope(expected: string | undefined, actual: string) {
  return !expected || expected === actual;
}
