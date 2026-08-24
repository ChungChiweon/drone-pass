import type { CertificationPackDescriptor } from "./certification-domain";

export class CertificationPackRegistry {
  private readonly packs = new Map<string, CertificationPackDescriptor>();

  constructor(initialPacks: CertificationPackDescriptor[] = []) {
    initialPacks.forEach((pack) => this.registerPack(pack));
  }

  registerPack(pack: CertificationPackDescriptor) {
    this.packs.set(pack.packId, { ...pack });
    return pack;
  }

  getPack(packId: string) {
    const pack = this.packs.get(packId);
    return pack ? { ...pack } : null;
  }

  getPacksByDomain(domainId: string) {
    return this.listPacks().filter((pack) => pack.domainId === domainId);
  }

  listPacks() {
    return [...this.packs.values()].map((pack) => ({ ...pack })).sort((left, right) => left.packId.localeCompare(right.packId));
  }
}

export function createCertificationPackRegistry(initialPacks: CertificationPackDescriptor[] = []) {
  return new CertificationPackRegistry(initialPacks);
}
