import type { LegalCandidateInput, LegalValidationResult, ValidationStatus } from "./legal-validation-types";
import { validateLegalSourceEvidence } from "./legal-source-evidence-validator";
import { validateLegalStatement } from "./legal-statement-validator";
import { validateLegalNumeric } from "./legal-numeric-validator";
import { validateLegalCondition } from "./legal-condition-validator";
import { validateLegalException } from "./legal-exception-validator";
import { validateLegalExamRelevance } from "./legal-exam-relevance-validator";
import { calculateLegalValidationScore } from "./legal-validation-score";

export function validateLegalCandidate(input:{candidate:LegalCandidateInput;batchId:string;duplicateStatus?:string;canonicalCandidateId?:string;conflictStatus?:string;conflictBlockers?:string[]}):LegalValidationResult{
  const {candidate:c}=input;const source=validateLegalSourceEvidence(c),statement=validateLegalStatement(c),numeric=validateLegalNumeric(c),condition=validateLegalCondition(c),exception=validateLegalException(c),relevance=validateLegalExamRelevance(c);
  const currentness=c.currentnessStatus.includes("CURRENT")?1:0;const score=calculateLegalValidationScore({source:source.score,statement:statement.score,numeric:numeric.score,condition:condition.score,exception:exception.score,currentness,exam:relevance.relevanceScore});
  const blockers=[...source.blockers,...statement.blockers,...numeric.blockers,...condition.blockers,...exception.blockers,...(input.conflictBlockers??[])];
  if(input.duplicateStatus==="EXACT_DUPLICATE"&&input.canonicalCandidateId!==c.candidateId)blockers.push("NON_CANONICAL_DUPLICATE");
  const warnings=[...c.warnings,...source.warnings,...statement.warnings,...numeric.warnings,...condition.warnings,...exception.warnings];
  let validationStatus:ValidationStatus="REVIEW_REQUIRED";
  if(blockers.includes("TABLE_UNRESOLVED"))validationStatus="BLOCKED_SOURCE";
  else if(blockers.includes("SUBSTANTIVE_CONFLICT"))validationStatus="BLOCKED_CONFLICT";
  else if(blockers.includes("NON_CANONICAL_DUPLICATE"))validationStatus="BLOCKED_DUPLICATE";
  else if(source.blockers.length)validationStatus="BLOCKED_SOURCE";
  else if(statement.blockers.length)validationStatus="BLOCKED_STATEMENT";
  else if(numeric.blockers.length)validationStatus="BLOCKED_NUMERIC";
  else if(condition.blockers.length)validationStatus="BLOCKED_CONDITION";
  else if(exception.blockers.length)validationStatus="BLOCKED_EXCEPTION";
  else if(relevance.examRelevance==="LOW"||relevance.examRelevance==="NONE")validationStatus="NOT_EXAM_RELEVANT";
  else if(score>=.95&&!warnings.length)validationStatus="VALIDATED";
  else if(score>=.90)validationStatus="VALIDATED_WITH_WARNING";
  const action=validationStatus==="VALIDATED"?"INCLUDE_IN_LEGAL_KNOWLEDGE_SET":validationStatus==="VALIDATED_WITH_WARNING"?"INCLUDE_WITH_WARNING":validationStatus==="BLOCKED_CONFLICT"?"REVIEW_CONFLICT":validationStatus==="BLOCKED_CONDITION"||validationStatus==="BLOCKED_EXCEPTION"?"REVIEW_CONDITION":validationStatus==="BLOCKED_SOURCE"?"REVIEW_SOURCE":validationStatus==="REVIEW_REQUIRED"?"KEEP_BLOCKED":"EXCLUDE";
  return{candidateId:c.candidateId,batchId:input.batchId,sourceId:c.sourceId,sourceVersionId:c.sourceVersionId,validationStatus,validationScore:score,sourceEvidenceScore:source.score,statementScore:statement.score,numericScore:numeric.score,conditionScore:condition.score,exceptionScore:exception.score,currentnessScore:currentness,examRelevanceScore:relevance.relevanceScore,duplicateStatus:input.duplicateStatus??"DISTINCT",conflictStatus:input.conflictStatus??"NO_CONFLICT",passedRules:[...source.passedRules,...statement.passedRules,...numeric.passedRules,...condition.passedRules,...exception.passedRules],failedRules:[...source.failedRules,...statement.failedRules,...numeric.failedRules,...condition.failedRules,...exception.failedRules],warnings:[...new Set(warnings)],blockers:[...new Set(blockers)],evidence:[...source.evidence,...statement.evidence,...numeric.evidence,...condition.evidence,...exception.evidence],recommendedAction:action,examRelevance:relevance.examRelevance,relevanceReasons:relevance.reasons,canonicalCandidateId:input.canonicalCandidateId};
}
