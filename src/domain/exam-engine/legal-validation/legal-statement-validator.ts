import type { LegalCandidateInput, RuleScore } from "./legal-validation-types";
const MODALS=[[/하여야|해야|받아야/,"OBLIGATION"],[/해서는 아니|하여서는 아니|금지/,"PROHIBITION"],[/할 수 있|할 수 있다/,"PERMISSION"],[/제외|적용하지 아니/,"EXCEPTION"],[/인정/,"RECOGNITION"]] as const;
export function validateLegalStatement(c:LegalCandidateInput):RuleScore {const raw=c.rawEvidenceText??"", normalized=c.normalizedStatement??"";const passed:string[]=[],failed:string[]=[],warnings:string[]=[],blockers:string[]=[],evidence:string[]=[];
  if(c.subject?.trim())passed.push("SUBJECT_PRESENT");else{failed.push("SUBJECT_PRESENT");blockers.push("SUBJECT_MISSING");}
  if(c.predicate?.trim())passed.push("PREDICATE_PRESENT");else{failed.push("PREDICATE_PRESENT");blockers.push("PREDICATE_MISSING");}
  if(normalized.length>=Math.min(20,raw.trim().length))passed.push("STATEMENT_COMPLETE");else{failed.push("STATEMENT_COMPLETE");blockers.push("STATEMENT_FRAGMENT");}
  for(const [pattern,label] of MODALS){if(pattern.test(raw)){if(pattern.test(normalized)){passed.push(`MODAL_${label}_PRESERVED`);}else{failed.push(`MODAL_${label}_PRESERVED`);blockers.push("MODALITY_DIRECTION_LOST");}}}
  evidence.push(raw.slice(0,240));return{score:Math.max(0,1-blockers.length*.3),passedRules:passed,failedRules:failed,warnings,blockers,evidence};}
