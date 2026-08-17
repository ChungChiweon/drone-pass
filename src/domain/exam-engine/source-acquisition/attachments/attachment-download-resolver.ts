import type { OfficialAttachmentRecord } from "./attachment-types";

export function resolveAttachmentDownload(record: OfficialAttachmentRecord): OfficialAttachmentRecord {
  if (!record.downloadUrl) return { ...record, validationStatus: "MANUAL_ACQUISITION_REQUIRED", notes: [...record.notes, "No verified download URL."] };
  const url = new URL(record.downloadUrl, record.officialPageUrl);
  if (!["law.go.kr", "www.law.go.kr", "molit.go.kr", "www.molit.go.kr", "main.kotsa.or.kr", "www.kotsa.or.kr"].includes(url.hostname.toLowerCase())) {
    return { ...record, downloadUrl: undefined, validationStatus: "MANUAL_ACQUISITION_REQUIRED", notes: [...record.notes, "Rejected non-official download host."] };
  }
  return { ...record, downloadUrl: url.toString() };
}

