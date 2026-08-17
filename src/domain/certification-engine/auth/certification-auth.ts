export type CertificationUserStatus = "active" | "suspended" | "pending";

export type CertificationUserIdentity = {
  userId: string;
  email?: string;
  displayName?: string;
  status: CertificationUserStatus;
};

export type CertificationRole = "LEARNER" | "INSTRUCTOR" | "REVIEWER" | "ADMIN";

export type CertificationPermission =
  | "READ"
  | "STUDY"
  | "EXAM"
  | "REVIEW"
  | "MANAGE_PACK"
  | "MANAGE_USER"
  | "ADMIN";

export type CertificationResourceScope = {
  domainId: string;
  packId: string;
  ownerId?: string;
};

export type CertificationAuthContext = {
  identity: CertificationUserIdentity;
  roles: CertificationRole[];
  permissions: CertificationPermission[];
  scope?: Partial<CertificationResourceScope>;
};

export type CertificationAuthAction =
  | "READ"
  | "STUDY"
  | "EXAM"
  | "REVIEW"
  | "MANAGE_PACK"
  | "MANAGE_USER"
  | "ADMIN";

export type AuthorizationResult = {
  allowed: boolean;
  reason?: string;
};
