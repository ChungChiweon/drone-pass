import type { ParentResolvedAttachment } from "./attachment-resolution-types";
export function validateParentVersionAttachment(item: ParentResolvedAttachment, expected: Pick<ParentResolvedAttachment, "parentSourceId" | "parentVersionId" | "effectiveDate">): string[] {
  const errors: string[] = [];
  if (item.parentSourceId !== expected.parentSourceId) errors.push("PARENT_SOURCE_MISMATCH");
  if (item.parentVersionId !== expected.parentVersionId) errors.push("PARENT_VERSION_MISMATCH");
  if (item.effectiveDate !== expected.effectiveDate) errors.push("EFFECTIVE_DATE_MISMATCH");
  if (item.versionStatus !== "CURRENT_EFFECTIVE") errors.push("NON_CURRENT_ATTACHMENT");
  if (item.resolutionConfidence < 0.9) errors.push("LOW_RESOLUTION_CONFIDENCE");
  return errors;
}
