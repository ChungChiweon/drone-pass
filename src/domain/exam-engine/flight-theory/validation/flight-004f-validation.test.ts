import {describe,expect,it} from "vitest";
import {validateChecklistItem} from "./checklist-item-validator";
import {validateOperationalDecision} from "./operational-decision-validator";
import {validateOperationalProcedure} from "./operational-procedure-validator";
import {validateOperationalRelationship} from "./operational-relationship-validator";

const source={sourceId:"official",page:1,section:"1"};
describe("flight theory 004F validation",()=>{
 it("blocks an ordered procedure without ordering evidence",()=>{const result=validateOperationalProcedure({procedureId:"p",name:"p",phase:"PREFLIGHT",steps:["a","b"],ordered:true,sourceReferences:[source],rawEvidenceText:"evidence",topicIds:["flight:test"]});expect(result.validationStatus).toBe("BLOCKED_ORDERING")});
 it("keeps an unordered checklist-like procedure valid",()=>{const result=validateOperationalProcedure({procedureId:"p",name:"p",phase:"PREFLIGHT",steps:["a","b"],ordered:false,sourceReferences:[source],rawEvidenceText:"evidence",topicIds:["flight:test"]});expect(result.validationStatus).toBe("VALIDATED")});
 it("validates a sourced checklist without inventing optional purpose",()=>{const result=validateChecklistItem({checklistId:"c",item:"check",phase:"PREFLIGHT",sourceReference:source,rawEvidenceText:"check",topicIds:["flight:test"]});expect(result.validationStatus).toBe("VALIDATED_WITH_WARNING")});
 it("separates monitoring from a supported decision",()=>{const monitoring=validateOperationalDecision({decisionId:"m",monitoredCondition:"signal",sourceReferences:[source],rawEvidenceText:"monitor signal",topicIds:["flight:test"]});const decision=validateOperationalDecision({decisionId:"d",monitoredCondition:"surface",trigger:"incorrect",decision:"do not fly",sourceReferences:[source],rawEvidenceText:"if incorrect, do not fly",topicIds:["flight:test"]});expect(monitoring.knowledgeType).toBe("OPERATIONAL_MONITORING");expect(decision.knowledgeType).toBe("OPERATIONAL_DECISION")});
 it("blocks synthetic or missing relationship endpoints",()=>{const result=validateOperationalRelationship({relationId:"r",sourceKnowledgeId:"a",targetKnowledgeId:"missing",relationType:"CHECKS",evidence:"e",sourceLocator:source},new Set(["a"]));expect(result.validationStatus).toBe("BLOCKED_RELATIONSHIP")});
});
