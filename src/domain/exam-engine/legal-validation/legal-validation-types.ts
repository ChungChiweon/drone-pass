export type ValidationStatus = "VALIDATED" | "VALIDATED_WITH_WARNING" | "BLOCKED_SOURCE" | "BLOCKED_STATEMENT" | "BLOCKED_NUMERIC" | "BLOCKED_CONDITION" | "BLOCKED_EXCEPTION" | "BLOCKED_CONFLICT" | "BLOCKED_DUPLICATE" | "NOT_EXAM_RELEVANT" | "REVIEW_REQUIRED";
export type RecommendedAction = "INCLUDE_IN_LEGAL_KNOWLEDGE_SET" | "INCLUDE_WITH_WARNING" | "EXCLUDE" | "KEEP_BLOCKED" | "REVIEW_SOURCE" | "REVIEW_CONDITION" | "REVIEW_CONFLICT";
export type LegalCandidateInput = {
  candidateId:string; sourceId:string; sourceVersionId?:string; sourceAuthority:string; sourceLocator?:string;
  subject?:string; predicate?:string; object?:string; value?:unknown; unit?:string; operator?:string;
  conditions:string[]; exceptions:string[]; applicability:string[]; effectiveDate?:string; factType?:string;
  rawEvidenceText?:string; normalizedStatement?:string; extractionConfidence:number; structureConfidence:number;
  currentnessStatus:string; examRelevance:"HIGH"|"MEDIUM"|"LOW"|"NONE"|"UNKNOWN"; validationEligibility:string;
  blockers:string[]; warnings:string[]; tableId?:string; duplicateGroup?:string;
};
export type RuleScore = { score:number; passedRules:string[]; failedRules:string[]; warnings:string[]; blockers:string[]; evidence:string[] };
export type LegalValidationResult = {
  candidateId:string; batchId:string; sourceId:string; sourceVersionId?:string; validationStatus:ValidationStatus; validationScore:number;
  sourceEvidenceScore:number; statementScore:number; numericScore:number; conditionScore:number; exceptionScore:number;
  currentnessScore:number; examRelevanceScore:number; duplicateStatus:string; conflictStatus:string;
  passedRules:string[]; failedRules:string[]; warnings:string[]; blockers:string[]; evidence:string[]; recommendedAction:RecommendedAction;
  examRelevance:"HIGH"|"MEDIUM"|"LOW"|"NONE"; relevanceReasons:string[]; canonicalCandidateId?:string;
};
