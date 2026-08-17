export type ParentAttachmentReferenceStatus = "RESOLVED" | "PARTIALLY_RESOLVED" | "NOT_AN_ATTACHMENT_REFERENCE" | "ATTACHMENT_MISSING" | "VERSION_AMBIGUOUS" | "DOWNLOAD_FAILED" | "EXTRACTION_FAILED" | "NOT_RELEVANT";

export type ParentResolvedAttachment = {
  parentSourceId: string; parentVersionId: string; attachmentId: string;
  attachmentType: "ANNEX" | "FORM" | "ADDENDUM"; attachmentNumber: string;
  canonicalTitle: string; relatedArticle?: string; officialPageUrl: string;
  downloadUrl: string; fileType: "hwp" | "hwpx" | "pdf" | "unknown";
  versionStatus: "CURRENT_EFFECTIVE" | "FUTURE" | "UNKNOWN"; effectiveDate: string;
  checksum?: string; localPath?: string; resolutionConfidence: number;
  validationStatus: "VALID" | "INVALID" | "MANUAL_ACQUISITION_REQUIRED"; warnings: string[];
};

export type ParsedAttachmentReference = {
  parentSourceId: string; parentVersionId: string; sourceLocator: string; articleNumber?: string;
  referencedAttachmentType: "ANNEX" | "FORM"; referencedAttachmentNumber: string;
  rawReferenceText: string; expectedTitle?: string; effectiveDate: string;
};
