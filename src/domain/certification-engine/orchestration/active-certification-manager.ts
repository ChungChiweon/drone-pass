import type { CertificationRuntimeSelection, CertificationUserContext } from "./certification-orchestration";

export class ActiveCertificationManager {
  private active = new Map<string, CertificationRuntimeSelection>();

  setActiveCertification(userId: string, selection: CertificationRuntimeSelection) {
    this.active.set(userId, { ...selection });
    return selection;
  }

  getActiveCertification(userId: string) {
    const selection = this.active.get(userId);
    return selection ? { ...selection } : null;
  }

  clearActiveCertification(userId: string) {
    return this.active.delete(userId);
  }

  toUserContext(userId: string): CertificationUserContext | null {
    const selection = this.getActiveCertification(userId);
    if (!selection) return null;
    return {
      userId,
      activeDomainId: selection.domainId,
      activePackId: selection.packId,
      activeRuntimeId: selection.runtimeId
    };
  }
}
