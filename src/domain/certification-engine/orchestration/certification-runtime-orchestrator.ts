import type { CertificationRuntimeRegistry } from "@/domain/certification-engine/runtime/certification-runtime-registry";
import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { CertificationRuntimeSelection, CertificationUserContext } from "./certification-orchestration";

export type RuntimeSelectionResult = {
  userContext: CertificationUserContext;
  selection: CertificationRuntimeSelection;
  runtime: CertificationRuntimeContext;
};

export function selectRuntime(
  userContext: CertificationUserContext,
  domainId: string,
  packId: string,
  runtimeRegistry: CertificationRuntimeRegistry,
  selectedAt = new Date().toISOString()
): RuntimeSelectionResult {
  const runtime = runtimeRegistry.getRuntimeByPack(packId);
  if (!runtime) throw new Error(`Runtime missing for pack: ${packId}`);
  validateRuntimeSelection(runtime, domainId, packId);
  const runtimeId = runtimeIdFor(runtime);
  const selection: CertificationRuntimeSelection = {
    domainId,
    packId,
    runtimeId,
    selectedAt
  };
  return {
    userContext: {
      ...userContext,
      activeDomainId: domainId,
      activePackId: packId,
      activeRuntimeId: runtimeId
    },
    selection,
    runtime
  };
}

export function validateRuntimeSelection(runtime: CertificationRuntimeContext, domainId: string, packId: string) {
  if (runtime.status !== "ready") throw new Error(`Runtime is not ready: ${runtime.status}`);
  if (runtime.domain.status !== "active") throw new Error(`Runtime domain is not active: ${runtime.domain.status}`);
  if (runtime.packDescriptor.status !== "active") throw new Error(`Runtime pack is not active: ${runtime.packDescriptor.status}`);
  if (runtime.domain.domainId !== domainId) throw new Error(`domain/runtime mismatch: ${domainId} !== ${runtime.domain.domainId}`);
  if (runtime.packDescriptor.packId !== packId) throw new Error(`pack/runtime mismatch: ${packId} !== ${runtime.packDescriptor.packId}`);
}

function runtimeIdFor(runtime: CertificationRuntimeContext) {
  return `${runtime.domain.domainId}:${runtime.packDescriptor.packId}:${runtime.packVersion.version}`;
}
