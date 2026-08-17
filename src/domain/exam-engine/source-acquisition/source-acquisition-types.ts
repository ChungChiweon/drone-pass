export type OfficialSourceType = "LAW" | "ENFORCEMENT_DECREE" | "ENFORCEMENT_RULE" | "ADMINISTRATIVE_RULE" | "NOTICE" | "ATTACHMENT" | "FORM";
export type OfficialSourceAuthority = "OFFICIAL_LAW" | "OFFICIAL_ADMINISTRATIVE_RULE";
export type SourceVersionStatus = "CURRENT_EFFECTIVE" | "FUTURE_EFFECTIVE" | "HISTORICAL" | "UNKNOWN";
export type SourceExtractionStatus = "SOURCE_ONLY" | "READY_FOR_EXTRACTION" | "EXTRACTED";
export type SourceValidationStatus = "READY" | "DOWNLOAD_FAILED" | "INVALID_CONTENT" | "HTML_ERROR_PAGE" | "MIME_MISMATCH" | "DUPLICATE_FILE" | "ATTACHMENT_MISSING";

export type OfficialSourceAttachment = {
  attachmentId: string;
  parentSourceId: string;
  title: string;
  attachmentType: "APPENDIX" | "FORM" | "ADDENDUM" | "AMENDMENT_REASON";
  fileName: string;
  fileType: string;
  officialUrl: string;
  localPath: string | null;
  checksum?: string;
  pageCount?: number;
  extractionStatus: SourceExtractionStatus | "MANUAL_ACQUISITION_REQUIRED";
};

export type OfficialSourceLocatorResult = {
  canonicalTitle: string;
  officialPageUrl: string;
  sourceAuthority: OfficialSourceAuthority;
  lawId: string;
  promulgationNumber: string;
  promulgationDate: string;
  effectiveDate: string;
  revisionType: string;
  currentVersion: string;
  futureEffectiveVersion?: string;
  availableAttachments: OfficialSourceAttachment[];
  retrievalTimestamp: string;
};

export type DownloadValidationInput = {
  httpStatus: number;
  declaredMime: string;
  fileName: string;
  bytes: Uint8Array;
  checksum?: string;
  knownChecksums?: ReadonlySet<string>;
  attachmentRequired?: boolean;
};

export type DownloadValidationResult = {
  valid: boolean;
  status: SourceValidationStatus;
  detectedMime: string;
  checksum?: string;
  contentLength: number;
  warnings: string[];
};

export type OfficialSourceRegistryEntry = {
  sourceId: string;
  currentEffectiveVersionId: string | null;
  futureEffectiveVersionIds: string[];
  historicalVersionIds: string[];
};

export type SourceRequestPolicy = {
  minimumIntervalMs: number;
  maximumRetries: number;
  resumePartialDownloads: boolean;
};

export const SOURCE_BATCH_REQUEST_POLICY: SourceRequestPolicy = {
  minimumIntervalMs: 1_000,
  maximumRetries: 2,
  resumePartialDownloads: true,
};
