import type { ParsedAttachmentReference } from "./attachment-resolution-types";

const REFERENCE = /(별표\s*제?\s*(\d+(?:의\d+)?)|별지\s*제?\s*(\d+(?:호)?)\s*서식)/g;

export function parseAttachmentReferences(input: Omit<ParsedAttachmentReference, "referencedAttachmentType" | "referencedAttachmentNumber" | "rawReferenceText"> & { text: string }): ParsedAttachmentReference[] {
  return [...input.text.matchAll(REFERENCE)].map((match) => ({ ...input,
    referencedAttachmentType: match[2] ? "ANNEX" : "FORM",
    referencedAttachmentNumber: (match[2] ?? match[3] ?? "").replace(/호$/, ""),
    rawReferenceText: match[0].replace(/\s+/g, " ").trim(),
  }));
}
