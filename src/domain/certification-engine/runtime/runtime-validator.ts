import type { CertificationDomain, CertificationPack, CertificationPackDescriptor, CertificationPackVersion } from "@/domain/certification-engine/certification-domain";

export type RuntimeValidationResult = {
  valid: boolean;
  errors: string[];
};

export function validateCertificationRuntime(input: {
  domain: CertificationDomain | null;
  packDescriptor: CertificationPackDescriptor | null;
  packVersion: CertificationPackVersion | null;
  pack: CertificationPack | null;
}): RuntimeValidationResult {
  const errors: string[] = [];
  if (!input.domain) errors.push("domain missing");
  if (!input.packDescriptor) errors.push("pack descriptor missing");
  if (!input.packVersion) errors.push("pack version missing");
  if (!input.pack) errors.push("pack missing");
  if (input.domain && input.packDescriptor && input.domain.domainId !== input.packDescriptor.domainId) {
    errors.push(`domain mismatch: ${input.domain.domainId} !== ${input.packDescriptor.domainId}`);
  }
  if (input.packDescriptor && input.pack && input.packDescriptor.packId !== input.pack.packId) {
    errors.push(`packId mismatch: ${input.packDescriptor.packId} !== ${input.pack.packId}`);
  }
  if (input.packDescriptor && input.pack && input.packDescriptor.domainId !== input.pack.domainId) {
    errors.push(`pack domain mismatch: ${input.packDescriptor.domainId} !== ${input.pack.domainId}`);
  }
  if (input.packDescriptor && input.packVersion && input.packDescriptor.packId !== input.packVersion.packId) {
    errors.push(`version pack mismatch: ${input.packDescriptor.packId} !== ${input.packVersion.packId}`);
  }
  if (input.packDescriptor && input.packVersion && input.packDescriptor.version !== input.packVersion.version) {
    errors.push(`version mismatch: ${input.packDescriptor.version} !== ${input.packVersion.version}`);
  }
  return { valid: errors.length === 0, errors };
}
