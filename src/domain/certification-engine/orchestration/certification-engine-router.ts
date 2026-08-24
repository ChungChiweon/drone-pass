import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import { getEngineBindings } from "@/domain/certification-engine/runtime/certification-engine-adapter";

export type CertificationEngineRoute = "knowledgeEngine" | "graphEngine" | "examEngine" | "adaptiveEngine" | "tutorEngine";

export function routeCertificationEngines(runtime: CertificationRuntimeContext) {
  return getEngineBindings(runtime);
}

export function routeCertificationEngine(runtime: CertificationRuntimeContext, route: CertificationEngineRoute) {
  return routeCertificationEngines(runtime)[route];
}
