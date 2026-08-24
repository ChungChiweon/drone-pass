import type { CertificationRuntimeContext } from "@/domain/certification-engine/runtime/certification-runtime";
import type { CertificationProgressContext, CertificationProgressScope } from "./certification-progress";

export type ProgressIsolationValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateProgressIsolation(input: {
  expectedUserId: string;
  runtime: CertificationRuntimeContext;
  progress: CertificationProgressContext;
}): ProgressIsolationValidationResult {
  const errors: string[] = [];
  if (input.progress.userId !== input.expectedUserId) errors.push(`user mismatch: ${input.expectedUserId} !== ${input.progress.userId}`);
  if (input.progress.domainId !== input.runtime.domain.domainId) errors.push(`domain mismatch: ${input.runtime.domain.domainId} !== ${input.progress.domainId}`);
  if (input.progress.packId !== input.runtime.packDescriptor.packId) errors.push(`pack mismatch: ${input.runtime.packDescriptor.packId} !== ${input.progress.packId}`);
  const runtimeId = `${input.runtime.domain.domainId}:${input.runtime.packDescriptor.packId}:${input.runtime.packVersion.version}`;
  if (input.progress.runtimeId !== runtimeId) errors.push(`runtime mismatch: ${runtimeId} !== ${input.progress.runtimeId}`);
  return { valid: errors.length === 0, errors };
}

export function scopeKey(scope: CertificationProgressScope) {
  return `${scope.userId}:${scope.certificationId}:${scope.packId}`;
}
