import type { ParentResolvedAttachment, ParsedAttachmentReference } from "./attachment-resolution-types";

export function locateParentAttachment(reference: ParsedAttachmentReference, attachments: ParentResolvedAttachment[]): ParentResolvedAttachment | undefined {
  const candidates = attachments.filter((item) => item.parentSourceId === reference.parentSourceId
    && item.parentVersionId === reference.parentVersionId
    && item.attachmentType === reference.referencedAttachmentType
    && item.attachmentNumber === reference.referencedAttachmentNumber
    && item.versionStatus === "CURRENT_EFFECTIVE");
  if (candidates.length !== 1 || candidates[0].resolutionConfidence < 0.9) return undefined;
  return candidates[0];
}
