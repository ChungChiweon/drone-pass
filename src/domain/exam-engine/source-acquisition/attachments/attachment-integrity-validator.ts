import type { OfficialAttachmentRecord } from "./attachment-types";

const HTML = /^\s*(?:<!doctype\s+html|<html|<body)/i;
export function validateAttachmentIntegrity(record: OfficialAttachmentRecord, bytes: Uint8Array, contentType: string): OfficialAttachmentRecord {
  const head = new TextDecoder("utf-8", { fatal: false }).decode(bytes.slice(0, 256));
  if (HTML.test(head) || /text\/html/i.test(contentType)) return { ...record, validationStatus: "HTML_ERROR_RESPONSE", notes: [...record.notes, "Download returned HTML instead of an attachment."] };
  const valid = isValidSignature(bytes, record.fileType);
  return { ...record, validationStatus: valid ? "VALID" : "INVALID_MIME", notes: [...record.notes, valid ? "File signature verified." : `Signature mismatch for ${record.fileType ?? "unknown"}.`] };
}

function isValidSignature(bytes: Uint8Array, fileType: OfficialAttachmentRecord["fileType"]): boolean {
  const ascii = String.fromCharCode(...bytes.slice(0, 8));
  if (fileType === "pdf") return ascii.startsWith("%PDF");
  if (fileType === "hwp") return ascii.startsWith("\u00d0\u00cf\u0011\u00e0") || ascii.startsWith("PK");
  if (fileType === "hwpx" || fileType === "docx") return ascii.startsWith("PK");
  if (fileType === "image") return ascii.startsWith("\u0089PNG") || ascii.startsWith("GIF8") || ascii.startsWith("\u00ff\u00d8");
  return bytes.length > 0;
}

