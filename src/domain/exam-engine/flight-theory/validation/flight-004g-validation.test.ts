import {describe,expect,it} from "vitest";
import {validateEmergencyDecision} from "./emergency-decision-validator";
import {validateEmergencyProcedure} from "./emergency-procedure-validator";
import {validateEmergencyRelationship} from "./emergency-relationship-validator";
import {validateFailureMode} from "./failure-mode-validator";
import {validateFailureSymptom} from "./failure-symptom-validator";
const primary={sourceId:"faa-ac-107-2a",page:1,section:"section"};
describe("flight theory 004G validation",()=>{
 it("requires primary source evidence",()=>{const result=validateFailureMode({failureId:"f",name:"failure",failureType:"FAULT",sourceReferences:[{sourceId:"faa-remote-pilot-study-guide",page:1,section:"s"}],rawEvidenceText:"text"});expect(result.status).toBe("BLOCKED")});
 it("keeps observable symptom separate from response",()=>{const result=validateFailureSymptom({symptomId:"s",failureId:"f",observedCondition:"delayed",response:"land",sourceReference:primary,rawEvidenceText:"delayed"});expect(result.blockers).toContain("SYMPTOM_CONTAINS_CAUSE_OR_RESPONSE")});
 it("blocks invented procedure ordering",()=>{const result=validateEmergencyProcedure({procedureId:"p",steps:["one","two"],ordered:true,orderingEvidence:"",entryCondition:"failure",sourceReferences:[primary],rawEvidenceText:"actions"});expect(result.blockers).toContain("ORDERING_EVIDENCE_MISSING")});
 it("requires a concrete decision trigger",()=>{const result=validateEmergencyDecision({decisionId:"d",trigger:"",observedCondition:"condition",allowedResponse:"inspect",sourceReferences:[primary],rawEvidenceText:"inspect"});expect(result.status).toBe("BLOCKED")});
 it("validates relation endpoint direction and type",()=>{const types=new Map([["f","FAILURE_MODE"],["d","EMERGENCY_DECISION"],["s","SAFETY_KNOWLEDGE"]]);const good=validateEmergencyRelationship({relationId:"r1",sourceKnowledgeId:"f",targetKnowledgeId:"d",relationType:"TRIGGERS",sourceReference:primary,evidence:"trigger"},types);const bad=validateEmergencyRelationship({relationId:"r2",sourceKnowledgeId:"f",targetKnowledgeId:"s",relationType:"CAUSES",sourceReference:primary,evidence:"co-mentioned"},types);expect(good.status).toBe("VALIDATED");expect(bad.status).toBe("BLOCKED")});
});
