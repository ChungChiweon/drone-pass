export type CertificationUserContext = {
  userId: string;
  activeDomainId: string;
  activePackId: string;
  activeRuntimeId: string;
};

export type CertificationRuntimeSelection = {
  domainId: string;
  packId: string;
  runtimeId: string;
  selectedAt: string;
};
