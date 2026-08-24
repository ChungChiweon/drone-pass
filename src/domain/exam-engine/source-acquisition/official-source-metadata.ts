import type { OfficialSourceAttachment, OfficialSourceAuthority, OfficialSourceType, SourceExtractionStatus, SourceValidationStatus, SourceVersionStatus } from "./source-acquisition-types";

export type OfficialSourceMetadata = {
  sourceId: string;
  canonicalTitle: string;
  sourceType: OfficialSourceType;
  issuingOrganization: string;
  authority: OfficialSourceAuthority;
  lawId: string;
  promulgationNumber: string;
  promulgationDate: string;
  effectiveDate: string;
  revisionType: string;
  versionStatus: SourceVersionStatus;
  officialPageUrl: string;
  downloadUrls: string[];
  localFiles: string[];
  attachments: OfficialSourceAttachment[];
  retrievedAt: string;
  checksum: string;
  contentLength: number;
  pageCount: number;
  currentnessVerified: boolean;
  verificationMethod: string;
  extractionStatus: SourceExtractionStatus;
  validationStatus: SourceValidationStatus;
  notes: string[];
};
