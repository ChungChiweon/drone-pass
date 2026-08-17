import type { CertificationPack } from "./certification-domain";

export type CertificationPackLoader = {
  loadPack(packId: string): Promise<CertificationPack | null>;
};

export function createStaticCertificationPackLoader(packs: CertificationPack[]): CertificationPackLoader {
  const packsById = new Map(packs.map((pack) => [pack.packId, pack]));
  return {
    async loadPack(packId: string) {
      return packsById.get(packId) ?? null;
    }
  };
}
