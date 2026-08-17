export type AttachmentType =
  | "ANNEX"
  | "FORM"
  | "ADDENDUM"
  | "ADMINISTRATIVE_RULE"
  | "GUIDELINE"
  | "EXAM_STANDARD";

export type AttachmentVersionStatus = "CURRENT_EFFECTIVE" | "FUTURE_EFFECTIVE" | "HISTORICAL" | "UNKNOWN";
export type AttachmentValidationStatus =
  | "DISCOVERED"
  | "VALID"
  | "INVALID_MIME"
  | "HTML_ERROR_RESPONSE"
  | "CHECKSUM_MISMATCH"
  | "BLOCKED_VERSION_AMBIGUITY"
  | "MANUAL_ACQUISITION_REQUIRED";

export type OfficialAttachmentRecord = {
  attachmentId: string;
  parentSourceId: string;
  parentVersionId: string;
  title: string;
  attachmentNumber?: string;
  attachmentType: AttachmentType;
  relatedArticle?: string;
  officialPageUrl: string;
  downloadUrl?: string;
  fileType?: "pdf" | "hwp" | "hwpx" | "docx" | "image" | "unknown";
  localPath?: string;
  checksum?: string;
  versionStatus: AttachmentVersionStatus;
  effectiveDate?: string;
  validationStatus: AttachmentValidationStatus;
  notes: string[];
};

export type AttachmentReferenceStatus =
  | "RESOLVED"
  | "PARTIALLY_RESOLVED"
  | "ATTACHMENT_MISSING"
  | "VERSION_AMBIGUOUS"
  | "EXTRACTION_FAILED"
  | "NOT_RELEVANT";

export type AttachmentReferenceResolution = {
  referenceId: string;
  parentSourceId: string;
  sourceLocator: string;
  referencedAttachment: string;
  attachmentId?: string;
  attachmentFound: boolean;
  attachmentCurrent: boolean;
  tableExtracted: boolean;
  linkedCandidateCount: number;
  status: AttachmentReferenceStatus;
  unresolvedReason?: string;
};

