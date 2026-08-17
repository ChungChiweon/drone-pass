import type { OfficialAttachmentRecord } from "./attachment-types";
import { parseLawAttachmentPage } from "./law-attachment-page-parser";

export type AttachmentLocatorInput = {
  parentSourceId: string;
  parentVersionId: string;
  officialPageUrl: string;
  effectiveDate?: string;
  html: string;
};

export function locateOfficialAttachments(input: AttachmentLocatorInput): OfficialAttachmentRecord[] {
  const host = new URL(input.officialPageUrl).hostname.toLowerCase();
  if (host !== "law.go.kr" && host !== "www.law.go.kr") return [];
  return parseLawAttachmentPage(input.html, input);
}

