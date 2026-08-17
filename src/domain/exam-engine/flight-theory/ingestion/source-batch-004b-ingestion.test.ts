import {describe,expect,it} from "vitest";
import {extractAircraftComponent} from "./aircraft-component-extractor";
import {extractAircraftSystem} from "./aircraft-system-extractor";
import {extractAttitudeControl} from "./attitude-control-extractor";
import {buildFlightTheoryRelationship} from "./flight-theory-relationship-builder";
const source={sourceId:"faa-phak-ch5",page:13,section:"Flight Controls"};
describe("SOURCE-BATCH-004B ingestion boundaries",()=>{
 it("does not invent a component function without source evidence",()=>{const value=extractAircraftComponent({componentId:"c:wing",name:"Wing",componentType:"WING",evidence:"The wing is named in the source.",sourceReference:source});expect(value?.function).toBe("");expect(value?.sourceReferences).toEqual([source]);});
 it("keeps components and systems separate",()=>{const value=extractAircraftSystem({systemId:"s:airframe",components:["c:wing"],evidence:"Airframe source evidence",sourceReference:source});expect(value?.components).toEqual(["c:wing"]);expect(value?.purpose).toBe("");});
 it("preserves pitch source fidelity",()=>{const value=extractAttitudeControl({conceptId:"flight-concept:pitch",name:"Pitch",controlAxis:"pitch",evidence:"Pitch is controlled by the elevators.",sourceReference:source,confidence:.8});expect(value?.properties).toContain("controlAxis:pitch");expect(value?.definition).toContain("Pitch");});
 it("requires evidence and blocks unsupported relationship types",()=>{expect(buildFlightTheoryRelationship({relationId:"r",fromId:"a",toId:"b",relationType:"PART_OF",evidence:"",sourceReference:source})).toBeNull();expect(buildFlightTheoryRelationship({relationId:"r",fromId:"a",toId:"b",relationType:"CONTROLS",evidence:"Roll is controlled by ailerons.",sourceReference:source})?.relationType).toBe("CONTROLS");});
});
