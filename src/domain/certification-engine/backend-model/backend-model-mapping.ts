import type { CertificationAuditRecord, CertificationDomainRecord, CertificationPackRecord, CertificationProgressRecord, CertificationRuntimeRecord, KnowledgeGraphRecord } from "./certification-backend-model";

export type BackendModelTableName =
  | "certification_domains"
  | "certification_packs"
  | "certification_runtimes"
  | "certification_progress"
  | "certification_graph_versions"
  | "certification_audit_logs";

export type BackendModelMapping<TRecord> = {
  entityName: string;
  tableName: BackendModelTableName;
  isolationKeys: Array<"userId" | "domainId" | "packId">;
  description: string;
  exampleRecord?: TRecord;
};

export const CERTIFICATION_BACKEND_MODEL_MAPPINGS = {
  domain: {
    entityName: "Domain",
    tableName: "certification_domains",
    isolationKeys: ["domainId"],
    description: "Certification domain metadata such as Drone Pass or future license domains."
  },
  pack: {
    entityName: "Pack",
    tableName: "certification_packs",
    isolationKeys: ["domainId", "packId"],
    description: "Versioned certification pack descriptor and source revision metadata."
  },
  runtime: {
    entityName: "Runtime",
    tableName: "certification_runtimes",
    isolationKeys: ["domainId", "packId"],
    description: "Runtime configuration envelope selected for a domain and pack."
  },
  progress: {
    entityName: "Progress",
    tableName: "certification_progress",
    isolationKeys: ["userId", "domainId", "packId"],
    description: "User-scoped learner state, analytics, adaptive state, and tutor state."
  },
  graph: {
    entityName: "Graph",
    tableName: "certification_graph_versions",
    isolationKeys: ["domainId", "packId"],
    description: "Versioned Knowledge Graph relations for a certification pack."
  },
  audit: {
    entityName: "Audit",
    tableName: "certification_audit_logs",
    isolationKeys: ["userId"],
    description: "Append-only change trail for backend certification entities."
  }
} satisfies {
  domain: BackendModelMapping<CertificationDomainRecord>;
  pack: BackendModelMapping<CertificationPackRecord>;
  runtime: BackendModelMapping<CertificationRuntimeRecord>;
  progress: BackendModelMapping<CertificationProgressRecord>;
  graph: BackendModelMapping<KnowledgeGraphRecord>;
  audit: BackendModelMapping<CertificationAuditRecord>;
};

export function getBackendModelMapping(entity: keyof typeof CERTIFICATION_BACKEND_MODEL_MAPPINGS) {
  return CERTIFICATION_BACKEND_MODEL_MAPPINGS[entity];
}
