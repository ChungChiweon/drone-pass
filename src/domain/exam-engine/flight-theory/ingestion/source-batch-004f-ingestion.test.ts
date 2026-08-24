import {describe,expect,it} from "vitest";
import {extractOperationalProcedure} from "./operational-procedure-extractor";
import {extractChecklistItem} from "./checklist-extractor";
import {extractOperationalDecision} from "./operational-decision-extractor";
import {classifyFlightPhase} from "./flight-phase-classifier";
import {extractOperationalWarnings} from "./operational-warning-extractor";
const source={sourceId:"faa-ac-107-2a",page:43,section:"7.3 Preflight Inspection Items"};
describe("SOURCE-BATCH-004F operational ingestion boundaries",()=>{
 it("blocks ordered procedures without explicit ordering evidence",()=>{expect(extractOperationalProcedure({procedureId:"p",name:"Check",phase:"PREFLIGHT",steps:["A","B"],prerequisites:[],conditions:[],decisionPoints:[],warnings:[],sourceReferences:[source],ordered:true,orderingEvidence:"",rawEvidenceText:"1. A 2. B",extractionConfidence:.9,topicIds:["flight:preflight-airframe"]})).toBeNull();});
 it("keeps a checklist distinct from a procedure",()=>{const item=extractChecklistItem({checklistId:"c",phase:"PREFLIGHT",item:"Check the airframe.",purpose:"Safe operation",condition:"Before flight",warning:"",sourceReference:source,rawEvidenceText:"Check the airframe.",topicIds:["flight:preflight-airframe"]});expect(item?.checklistId).toBe("c");});
 it("requires both trigger and decision evidence",()=>{expect(extractOperationalDecision({decisionId:"d",monitoredCondition:"control response",trigger:"",decision:"Do not fly",alternatives:[],limitations:[],sourceReferences:[source],rawEvidenceText:"Do not fly",topicIds:[]})).toBeNull();});
 it("classifies only explicit phases",()=>{expect(classifyFlightPhase("Post-flight review")).toBe("POSTFLIGHT");expect(classifyFlightPhase("In-flight monitoring")).toBe("IN_FLIGHT");});
 it("extracts explicit prohibitions without inventing thresholds",()=>{expect(extractOperationalWarnings("The remote PIC may not conduct flight operations. Check battery status.")).toEqual(["The remote PIC may not conduct flight operations."]);});
});
