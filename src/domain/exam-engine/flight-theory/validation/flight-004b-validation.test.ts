import {describe,expect,it} from "vitest";
import {validateAircraftComponent} from "./aircraft-component-validator";
import {validateAircraftSystem} from "./aircraft-system-validator";
import {validateAircraftStructure} from "./aircraft-structure-validator";
import {validateFlightRelationship004B} from "./flight-relationship-validator";
import {buildCanonicalFlight004B} from "../canonical/canonical-flight-builder";
const ref={sourceId:"faa-phak-ch5",page:13,section:"Axes of an Aircraft"};
describe("FLIGHT-THEORY-004B validation",()=>{
 it("accepts an evidenced component with an explicit-function warning",()=>{const result=validateAircraftComponent({componentId:"component:wing",name:"Wing",function:"",structure:"Source structure",topicId:"flight:wing",sourceReferences:[ref],rawEvidenceText:"The source identifies a wing."});expect(result.validationStatus).toBe("VALIDATED_WITH_WARNING");expect(result.warnings).toContain("FUNCTION_NOT_EXPLICIT_IN_SOURCE");});
 it("blocks a system whose component mapping is absent",()=>{const result=validateAircraftSystem({systemId:"system:flight-control",purpose:"",components:[],dependencies:[],topicIds:[],sourceReferences:[ref],rawEvidenceText:"Flight controls are discussed."});expect(result.validationStatus).toBe("BLOCKED_STRUCTURE");});
 it("validates a sourced axis concept without adding multicopter mechanics",()=>{const result=validateAircraftStructure({conceptId:"flight-concept:pitch",name:"Pitch",definition:"Pitch is motion about the lateral axis.",topic:"flight:pitch",sourceReferences:[ref],rawEvidenceText:"Pitch is motion about the lateral axis."});expect(result.validationStatus).toBe("VALIDATED");});
 it("blocks a relationship with a missing endpoint",()=>{const result=validateFlightRelationship004B({relationId:"r",fromId:"a",toId:"missing",topicId:"flight:pitch",evidence:"Pitch is controlled by elevators.",sourceReferences:[ref],knownIds:new Set(["a"])});expect(result.validationStatus).toBe("BLOCKED_RELATIONSHIP");});
 it("builds a deterministic detached 004B canonical checksum",()=>{const input={version:"1",batchId:"004B" as const,sourceSnapshotId:"snapshot",conceptIds:[],principleIds:[],formulaIds:[],componentIds:[],systemIds:[],relationshipIds:[],blockedIds:[],warningIds:[],topicCoverage:[],generatedAt:"2026-08-10T00:00:00Z",units:[]};expect(buildCanonicalFlight004B(input).checksum).toBe(buildCanonicalFlight004B(input).checksum);expect(buildCanonicalFlight004B(input).batchId).toBe("004B");});
});
