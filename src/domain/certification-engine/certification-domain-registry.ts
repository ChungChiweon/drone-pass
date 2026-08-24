import type { CertificationDomain } from "./certification-domain";
import { DRONE_CERTIFICATION_DOMAIN } from "./certification-domain";

export class CertificationDomainRegistry {
  private readonly domains = new Map<string, CertificationDomain>();

  constructor(initialDomains: CertificationDomain[] = []) {
    initialDomains.forEach((domain) => this.registerDomain(domain));
  }

  registerDomain(domain: CertificationDomain) {
    this.domains.set(domain.domainId, { ...domain });
    return domain;
  }

  getDomain(domainId: string) {
    const domain = this.domains.get(domainId);
    return domain ? { ...domain } : null;
  }

  listDomains() {
    return [...this.domains.values()].map((domain) => ({ ...domain })).sort((left, right) => left.domainId.localeCompare(right.domainId));
  }
}

export function createCertificationDomainRegistry(initialDomains: CertificationDomain[] = [DRONE_CERTIFICATION_DOMAIN]) {
  return new CertificationDomainRegistry(initialDomains);
}
