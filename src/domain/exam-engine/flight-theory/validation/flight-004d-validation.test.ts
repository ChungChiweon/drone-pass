import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {validateSensorComponent004D} from "./sensor-component-validator";
import {validateNavigationKnowledge004D} from "./navigation-knowledge-validator";
import {validateNavigationRelationship004D} from "./navigation-relationship-validator";

const root=process.cwd(); const load=<T>(p:string)=>JSON.parse(readFileSync(join(root,p),"utf8")) as T;
const ref=[{sourceId:"official",page:1,section:"section"}];
type Summary={primaryKnowledgeCount:number;visualCount:number;tableCount:number;gapCount:number;canonicalIdIssued:number;inputDrift:boolean;unsupportedInferenceCount:number;mutations:Record<string,number>;runtimeReadiness:string};
type Inventory={canonicalId:string|null}; type Boundary={"004B":Array<{classification:string}>;"004G":Array<{classification:string}>}; type Support={blocksPrimary:boolean};
describe("FLIGHT-THEORY-004D validation",()=>{
 it("preserves the exact Primary/Visual/Table split",()=>{const s=load<Summary>("work/flight-theory-validation/004d/results/validation-summary.json");expect([s.primaryKnowledgeCount,s.visualCount,s.tableCount]).toEqual([20,1,1]);});
 it("enforces sensor role fidelity",()=>{const r=validateSensorComponent004D({componentId:"sensor-component:gyroscope",measuredVariable:"acceleration",function:"measures acceleration",output:"acceleration",sourceReferences:ref,rawEvidenceText:"evidence",technicalContext:"SENSOR_GENERAL"});expect(r.validationStatus).toBe("BLOCKED_SENSOR_ROLE");});
 it.each(["IMU sensor fusion","GPS return to home","GPS position hold","GPS home point","GPS geofencing","barometer altitude hold","obstacle detection"])("blocks context synthesis: %s",statement=>{const r=validateNavigationKnowledge004D({knowledgeId:"test",statement,sourceReferences:ref,rawEvidenceText:"evidence",technicalContext:"AVIATION_NAVIGATION"});expect(r.validationStatus).toBe("BLOCKED_CONTEXT_GENERALIZATION");});
 it("blocks relationship-based IMU/fusion synthesis",()=>{const r=validateNavigationRelationship004D({relationshipId:"r",sourceKnowledgeId:"imu",targetKnowledgeId:"sensor fusion",evidence:"e",sourceLocator:ref[0],knownIds:new Set(["imu","sensor fusion"])});expect(r.validationStatus).toBe("BLOCKED_CONTEXT_GENERALIZATION");});
 it("records 004B and 004G boundaries",()=>{const b=load<Boundary>("work/flight-theory-validation/004d/results/duplicate-boundary-analysis.json");expect(b["004B"][0].classification).toBe("CONTROL_SYSTEM_004B_OVERLAP");expect(b["004G"][0].classification).toBe("TECHNICAL_VS_EMERGENCY");});
 it("keeps visual/table support independent",()=>{const v=load<Support[]>("work/flight-theory-validation/004d/results/visual-validation.json")[0];const t=load<Support[]>("work/flight-theory-validation/004d/results/table-validation.json")[0];expect(v.blocksPrimary).toBe(false);expect(t.blocksPrimary).toBe(false);});
 it("protects 14 gaps and leaves the validation inventory without Canonical IDs",()=>{const s=load<Summary>("work/flight-theory-validation/004d/results/validation-summary.json");const i=load<Inventory[]>("work/flight-theory-validation/004d/results/canonical-candidate-inventory.json");expect(s.gapCount).toBe(14);expect(i).toHaveLength(20);expect(i.every(x=>x.canonicalId===null)).toBe(true);expect(s.canonicalIdIssued).toBe(0);});
 it("reports no drift, unsupported inference, or mutation",()=>{const s=load<Summary>("work/flight-theory-validation/004d/results/validation-summary.json");expect(s.inputDrift).toBe(false);expect(s.unsupportedInferenceCount).toBe(0);expect(Object.values(s.mutations).every(v=>v===0)).toBe(true);expect(s.runtimeReadiness).toBe("READY_FOR_CANONICAL_BUILD_WITH_GAPS");});
});
