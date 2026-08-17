import {describe,expect,it} from "vitest";
import {extractEmergencyDecision} from "./emergency-decision-extractor";
import {extractEmergencyProcedure} from "./emergency-procedure-extractor";
import {extractFailureMode} from "./failure-mode-extractor";
import {extractFailureResponse} from "./failure-response-extractor";
import {extractFailureSymptom} from "./failure-symptom-extractor";
const source={sourceId:"official",page:1,section:"section"};
describe("source batch 004G ingestion guards",()=>{
 it("does not create a failure without source or affected context",()=>{expect(extractFailureMode({failureId:"f",name:"failure",evidence:"",topicIds:[]})).toBeNull();expect(extractFailureMode({failureId:"f",name:"failure",evidence:"e",sourceReference:source,topicIds:[]})).toBeNull()});
 it("keeps absent cause and response empty",()=>{const value=extractFailureMode({failureId:"f",name:"link interference",failureType:"INTERFERENCE",evidence:"e",sourceReference:source,topicIds:["flight:emergency-link-loss"]});expect(value?.causes).toEqual([]);expect(value?.response).toEqual([])});
 it("creates symptoms only with direct evidence",()=>{expect(extractFailureSymptom({symptomId:"s",failureId:"f",observedCondition:"delayed input",evidence:"",sourceReference:source})).toBeNull()});
 it("does not mark an unordered emergency action as ordered",()=>{const value=extractEmergencyProcedure({procedureId:"p",emergencyType:"IN_FLIGHT",phase:"IN_FLIGHT",steps:["minimize injury"],entryCondition:"emergency",sourceReferences:[source],rawEvidenceText:"take action",topicIds:[]});expect(value?.ordered).toBe(false)});
 it("requires a concrete trigger for a decision",()=>{expect(extractEmergencyDecision({decisionId:"d",observedCondition:"battery",allowedResponse:"inspect",sourceReferences:[source],rawEvidenceText:"inspect",topicIds:[]})).toBeNull()});
 it("marks manufacturer-specific response instead of generalizing it",()=>{expect(extractFailureResponse({response:"Follow the operating manual",evidence:"manual",manufacturerSpecific:true})?.scope).toBe("MANUFACTURER_SPECIFIC")});
});
