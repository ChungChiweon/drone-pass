import type { CertificationAuditRecord } from "@/domain/certification-engine/backend-model/certification-backend-model";
import type { CertificationProgressContext } from "@/domain/certification-engine/progress/certification-progress";
import type { CertificationServiceContext } from "./certification-service-context";
import type { CertificationServices } from "./certification-services";

export function createCertificationServices(context: CertificationServiceContext): CertificationServices {
  const auditRecords = context.auditRecords ?? [];
  const graphRecords = context.graphRecords ?? [];

  return {
    domainService: {
      async getDomain(domainId) {
        assertServiceAccess(context, "READ", { domainId, packId: context.accessControl.context.packId });
        return context.domainRegistry?.getDomain(domainId) ?? context.runtimeRegistry.getRuntime(domainId)?.domain ?? null;
      },
      async listDomains() {
        assertServiceAccess(context, "READ");
        return context.domainRegistry?.listDomains() ?? context.runtimeRegistry.listActiveRuntimes().map((runtime) => runtime.domain);
      }
    },
    packService: {
      async getPack(packId) {
        assertServiceAccess(context, "READ", { domainId: context.accessControl.context.domainId, packId });
        return context.packRegistry?.getPack(packId) ?? context.runtimeRegistry.getRuntimeByPack(packId)?.packDescriptor ?? null;
      },
      async listPacks(domainId) {
        assertServiceAccess(context, "READ", { domainId, packId: context.accessControl.context.packId });
        return context.packRegistry?.getPacksByDomain(domainId)
          ?? context.runtimeRegistry.listActiveRuntimes().filter((runtime) => runtime.domain.domainId === domainId).map((runtime) => runtime.packDescriptor);
      }
    },
    runtimeService: {
      async getRuntime(runtimeId) {
        assertServiceAccess(context, "READ");
        return findRuntimeById(context, runtimeId);
      },
      async activateRuntime(runtimeId) {
        assertServiceAccess(context, "WRITE");
        return findRuntimeById(context, runtimeId);
      }
    },
    progressService: {
      async getProgress(userId, packId) {
        assertServiceAccess(context, "READ", { domainId: context.accessControl.context.domainId, packId, userId });
        return context.repository.loadProgress(userId, context.accessControl.context.domainId, packId);
      },
      async updateProgress(progressContext: CertificationProgressContext) {
        assertServiceAccess(context, "WRITE", {
          domainId: progressContext.domainId,
          packId: progressContext.packId,
          userId: progressContext.userId
        });
        await context.repository.persistProgress(progressContext);
        return progressContext;
      }
    },
    graphService: {
      async getActiveGraph(packId) {
        assertServiceAccess(context, "READ", { domainId: context.accessControl.context.domainId, packId });
        return graphRecords.find((record) => record.packId === packId && record.status === "active") ?? null;
      },
      async getGraphVersion(versionId) {
        assertServiceAccess(context, "READ");
        return graphRecords.find((record) => record.versionId === versionId) ?? null;
      }
    },
    auditService: {
      async recordAudit(record) {
        assertServiceAccess(context, "WRITE", { userId: record.userId });
        auditRecords.push(cloneAuditRecord(record));
        return cloneAuditRecord(record);
      },
      async getAuditHistory(entityId) {
        assertServiceAccess(context, "READ");
        return auditRecords.filter((record) => record.entityId === entityId).map(cloneAuditRecord);
      }
    }
  };
}

function assertServiceAccess(context: CertificationServiceContext, action: "READ" | "WRITE", scope: { domainId?: string; packId?: string; userId?: string } = {}) {
  const access = context.accessControl.validate(action, {
    domainId: scope.domainId ?? context.accessControl.context.domainId,
    packId: scope.packId ?? context.accessControl.context.packId,
    userId: scope.userId
  });
  if (!access.allowed) {
    throw new Error(access.reason ?? "Service access denied");
  }
}

function findRuntimeById(context: CertificationServiceContext, runtimeId: string) {
  return context.runtimeRegistry.listActiveRuntimes().find((runtime) => toRuntimeId(runtime) === runtimeId) ?? null;
}

function toRuntimeId(runtime: { domain: { domainId: string }; packDescriptor: { packId: string }; packVersion: { version: string } }) {
  return `${runtime.domain.domainId}:${runtime.packDescriptor.packId}:${runtime.packVersion.version}`;
}

function cloneAuditRecord(record: CertificationAuditRecord): CertificationAuditRecord {
  return {
    ...record,
    beforeState: cloneJson(record.beforeState),
    afterState: cloneJson(record.afterState)
  };
}

function cloneJson<T>(value: T): T {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value)) as T;
}
