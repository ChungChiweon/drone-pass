import type { OfficialAttachmentRecord } from "./attachment-types";

export function createAdministrativeRuleSource(input: {
  sourceId: string;
  title: string;
  ruleSequence: string;
  version: string;
  effectiveDate?: string;
  officialPageUrl: string;
  issuingOrganization: string;
}): OfficialAttachmentRecord {
  return {
    attachmentId: `${input.sourceId}:rule:${input.ruleSequence}`,
    parentSourceId: input.sourceId,
    parentVersionId: input.version,
    title: input.title,
    attachmentType: "ADMINISTRATIVE_RULE",
    officialPageUrl: input.officialPageUrl,
    versionStatus: input.effectiveDate ? "CURRENT_EFFECTIVE" : "UNKNOWN",
    effectiveDate: input.effectiveDate,
    validationStatus: input.effectiveDate ? "DISCOVERED" : "BLOCKED_VERSION_AMBIGUITY",
    notes: [`Issuing organization: ${input.issuingOrganization}`, `Official sequence: ${input.ruleSequence}`],
  };
}

