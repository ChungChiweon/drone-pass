import {describe,expect,it} from "vitest";
import {validateLegalCandidate} from "./legal-candidate-validator";
import {validateLegalDuplicates} from "./legal-duplicate-validator";
import {buildLegalKnowledgeSet} from "./legal-knowledge-set-builder";
import type {LegalCandidateInput} from "./legal-validation-types";
const base:LegalCandidateInput={candidateId:"c1",sourceId:"law",sourceVersionId:"v1",sourceAuthority:"OFFICIAL_LAW",sourceLocator:"제1조",subject:"사업자",predicate:"OBLIGATION",conditions:[],exceptions:[],applicability:[],rawEvidenceText:"사업자는 승인을 받아야 한다.",normalizedStatement:"사업자는 승인을 받아야 한다.",extractionConfidence:1,structureConfidence:1,currentnessStatus:"CURRENT_EFFECTIVE",examRelevance:"HIGH",validationEligibility:"ELIGIBLE",blockers:[],warnings:[]};
describe("legal validation",()=>{
 it("never validates future-only or unresolved table evidence",()=>{expect(validateLegalCandidate({candidate:{...base,currentnessStatus:"FUTURE_EFFECTIVE"},batchId:"b"}).validationStatus).toBe("BLOCKED_SOURCE");expect(validateLegalCandidate({candidate:{...base,validationEligibility:"BLOCKED_TABLE_UNRESOLVED"},batchId:"b"}).validationStatus).toBe("BLOCKED_SOURCE");});
 it("blocks changed modality even with a high aggregate score",()=>{const r=validateLegalCandidate({candidate:{...base,normalizedStatement:"사업자는 승인할 수 있다."},batchId:"b"});expect(r.validationStatus).toBe("BLOCKED_STATEMENT");expect(r.blockers).toContain("MODALITY_DIRECTION_LOST");});
 it("blocks numeric operator conflicts",()=>{const r=validateLegalCandidate({candidate:{...base,value:25,unit:"kg",operator:"GTE",rawEvidenceText:"25kg 이하",normalizedStatement:"25kg 이하"},batchId:"b"});expect(r.validationStatus).toBe("BLOCKED_NUMERIC");});
 it("selects a deterministic duplicate canonical",()=>{const map=validateLegalDuplicates([base,{...base,candidateId:"c2",extractionConfidence:.8}]);expect(map.get("c2")?.status).toBe("EXACT_DUPLICATE");expect(map.get("c2")?.canonicalCandidateId).toBe("c1");});
 it("builds a candidate set without mutating a pack",()=>{const r=validateLegalCandidate({candidate:base,batchId:"b"});const set=buildLegalKnowledgeSet({results:[r],sourceSnapshotId:"s",generatedAt:"2026-01-01T00:00:00Z"});expect(set.candidateIds).toContain("c1");expect(set.checksum).toMatch(/^fnv1a-/);});
});
