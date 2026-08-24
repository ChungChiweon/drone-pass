import type { CertificationDomainRegistry } from "@/domain/certification-engine/certification-domain-registry";
import type { CertificationPackLoader } from "@/domain/certification-engine/certification-pack-loader";
import type { CertificationPackRegistry } from "@/domain/certification-engine/certification-pack-registry";
import type { CertificationExamConfig, CertificationPackVersion } from "@/domain/certification-engine/certification-domain";
import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { CertificationRuntimeContext } from "./certification-runtime";
import { validateCertificationRuntime } from "./runtime-validator";

export type CertificationRuntimeLoaderDependencies = {
  domainRegistry: CertificationDomainRegistry;
  packRegistry: CertificationPackRegistry;
  packLoader: CertificationPackLoader;
  versions: CertificationPackVersion[];
  examConfig: CertificationExamConfig;
  relations?: KnowledgeRelation[];
  activeGraphVersionId?: string;
  learnerConfig?: CertificationRuntimeContext["learnerConfig"];
};

export async function loadCertificationRuntime(
  domainId: string,
  packId: string,
  dependencies: CertificationRuntimeLoaderDependencies
): Promise<CertificationRuntimeContext> {
  const domain = dependencies.domainRegistry.getDomain(domainId);
  const packDescriptor = dependencies.packRegistry.getPack(packId);
  const pack = await dependencies.packLoader.loadPack(packId);
  const packVersion = dependencies.versions.find((version) => version.packId === packId && version.version === packDescriptor?.version) ?? null;
  const validation = validateCertificationRuntime({ domain, packDescriptor, packVersion, pack });
  if (!validation.valid) {
    throw new Error(`Certification runtime validation failed: ${validation.errors.join("; ")}`);
  }

  return {
    status: "ready",
    domain: domain!,
    packDescriptor: packDescriptor!,
    packVersion: packVersion!,
    pack: pack!,
    knowledgeGraph: {
      relations: dependencies.relations ?? [],
      activeVersionId: dependencies.activeGraphVersionId
    },
    examConfig: dependencies.examConfig,
    learnerConfig: dependencies.learnerConfig ?? {
      masteryThreshold: 0.8,
      reviewIntervalDays: 7
    }
  };
}
