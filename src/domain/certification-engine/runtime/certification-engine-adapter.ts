import type { CertificationEngineContext } from "@/domain/certification-engine/certification-domain";
import type { CertificationRuntimeContext } from "./certification-runtime";

export type CertificationEngineAdapterContext = CertificationEngineContext & {
  runtimeStatus: CertificationRuntimeContext["status"];
};

export function adaptRuntimeToEngineContext(runtime: CertificationRuntimeContext): CertificationEngineAdapterContext {
  return {
    runtimeStatus: runtime.status,
    domain: runtime.domain,
    pack: runtime.pack,
    packDescriptor: runtime.packDescriptor,
    packVersion: runtime.packVersion,
    knowledgeGraph: runtime.knowledgeGraph,
    examConfig: runtime.examConfig,
    learnerConfig: runtime.learnerConfig
  };
}

export function getEngineBindings(runtime: CertificationRuntimeContext) {
  return {
    knowledgeEngine: runtime.pack,
    graphEngine: runtime.knowledgeGraph,
    examEngine: runtime.examConfig,
    adaptiveEngine: runtime.learnerConfig,
    tutorEngine: {
      domainId: runtime.domain.domainId,
      packId: runtime.packDescriptor.packId
    }
  };
}
