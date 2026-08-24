import type { LegalCandidateInput, RuleScore } from "./legal-validation-types";
export type SourceEvidenceStatus = "VERIFIED_CURRENT_OFFICIAL"|"VERIFIED_OFFICIAL_WITH_WARNING"|"FUTURE_EFFECTIVE_ONLY"|"OUTDATED_ONLY"|"UNVERIFIABLE"|"TABLE_UNRESOLVED";
export function validateLegalSourceEvidence(c:LegalCandidateInput):RuleScore & {status:SourceEvidenceStatus} {
  const passed:string[]=[], failed:string[]=[], warnings:string[]=[], blockers:string[]=[], evidence:string[]=[];
  const official=c.sourceAuthority.startsWith("OFFICIAL"); if(official) passed.push("OFFICIAL_SOURCE"); else { failed.push("OFFICIAL_SOURCE"); blockers.push("SOURCE_NOT_OFFICIAL"); }
  if(c.sourceVersionId) passed.push("SOURCE_VERSION_PRESENT"); else {failed.push("SOURCE_VERSION_PRESENT");blockers.push("SOURCE_VERSION_MISSING");}
  if(c.sourceLocator && !/^DOCUMENT$/i.test(c.sourceLocator)) passed.push("EXACT_LOCATOR"); else {failed.push("EXACT_LOCATOR");blockers.push("EXACT_LOCATOR_MISSING");}
  if(c.rawEvidenceText?.trim()) passed.push("RAW_EVIDENCE_PRESENT"); else {failed.push("RAW_EVIDENCE_PRESENT");blockers.push("RAW_EVIDENCE_MISSING");}
  if(c.validationEligibility==="BLOCKED_TABLE_UNRESOLVED") blockers.push("TABLE_UNRESOLVED");
  let status:SourceEvidenceStatus="UNVERIFIABLE";
  if(c.validationEligibility==="BLOCKED_TABLE_UNRESOLVED") status="TABLE_UNRESOLVED";
  else if(/FUTURE/.test(c.currentnessStatus)) {status="FUTURE_EFFECTIVE_ONLY";blockers.push("FUTURE_EFFECTIVE_ONLY");}
  else if(/OUTDATED|EXPIRED|ARCHIVED/.test(c.currentnessStatus)){status="OUTDATED_ONLY";blockers.push("OUTDATED_ONLY");}
  else if(official && !blockers.length) status=warnings.length?"VERIFIED_OFFICIAL_WITH_WARNING":"VERIFIED_CURRENT_OFFICIAL";
  evidence.push(`${c.sourceId}:${c.sourceVersionId??"missing"}:${c.sourceLocator??"missing"}`);
  return {status,score:Math.max(0,1-blockers.length*.25-warnings.length*.05),passedRules:passed,failedRules:failed,warnings,blockers,evidence};
}
