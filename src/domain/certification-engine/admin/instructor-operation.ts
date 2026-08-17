import type { CertificationAuthContext } from "@/domain/certification-engine/auth/certification-auth";
import { canAccess } from "@/domain/certification-engine/auth/authorization-policy";

export type InstructorAnalyticsRequest = {
  domainId: string;
  packId: string;
  reportId: string;
};

export type InstructorReportView = {
  allowed: boolean;
  reportId: string;
  message: string;
};

export function prepareLearningAnalyticsView(
  authContext: CertificationAuthContext,
  request: InstructorAnalyticsRequest
): InstructorReportView {
  const access = canAccess(authContext, "READ", {
    domainId: request.domainId,
    packId: request.packId
  });
  if (!access.allowed) {
    return { allowed: false, reportId: request.reportId, message: access.reason ?? "Analytics access denied" };
  }
  return {
    allowed: true,
    reportId: request.reportId,
    message: "Learning analytics report view prepared"
  };
}
