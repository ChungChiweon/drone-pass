import type { LegalCandidateInput, LegalValidationResult } from "./legal-validation-types";
import type { LegalConflictRecord } from "./legal-conflict-validator";
import { validateLegalConflict } from "./legal-conflict-validator";
import { validateLegalDuplicates } from "./legal-duplicate-validator";
import { validateLegalCandidate } from "./legal-candidate-validator";
export function runLegalValidation(input:{batchId:string;candidates:LegalCandidateInput[];conflicts:LegalConflictRecord[]}):LegalValidationResult[]{const duplicates=validateLegalDuplicates(input.candidates);return [...input.candidates].sort((a,b)=>a.candidateId.localeCompare(b.candidateId)).map(candidate=>{const duplicate=duplicates.get(candidate.candidateId);const conflict=validateLegalConflict(candidate.candidateId,input.conflicts);return validateLegalCandidate({candidate,batchId:input.batchId,duplicateStatus:duplicate?.status,canonicalCandidateId:duplicate?.canonicalCandidateId,conflictStatus:conflict.status,conflictBlockers:conflict.blockers});});}
