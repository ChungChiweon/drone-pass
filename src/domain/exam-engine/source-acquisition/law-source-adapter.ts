import type { OfficialSourceLocatorResult, OfficialSourceType } from "./source-acquisition-types";

export type LawSourceAdapterInput = {
  title: string;
  sourceType: OfficialSourceType;
  lawId: string;
  lsiSeq: string;
  effectiveDate: string;
};

export function buildLawSourceLocator(input: LawSourceAdapterInput, retrievedAt = new Date().toISOString()): OfficialSourceLocatorResult {
  const encoded = encodeURIComponent(input.title);
  return {
    canonicalTitle: input.title,
    officialPageUrl: `https://www.law.go.kr/법령/${encoded}`,
    sourceAuthority: "OFFICIAL_LAW",
    lawId: input.lawId,
    promulgationNumber: "",
    promulgationDate: "",
    effectiveDate: input.effectiveDate,
    revisionType: "",
    currentVersion: input.lsiSeq,
    availableAttachments: [],
    retrievalTimestamp: retrievedAt,
  };
}
