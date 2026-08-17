import {readFileSync,existsSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
type Unit={knowledgeId:string;knowledgeType:string;technicalContext:string;sourceCanonicalId?:string;targetCanonicalId?:string;questionConstraints:{allowed:string[];prohibited:string[]};warnings:string[]};
type Set={canonicalUnits:Unit[];relationshipUnits:Unit[];gapAnalysis:{count:number;topics:string[]};visualSupportIds:string[];unresolvedTableIds:string[];checksum:string};
type Summary={canonicalInput:number;canonicalGenerated:number;canonicalUnits:number;relationshipUnits:number;candidateStatus:Record<string,number>;uasSpecificCount:number;visualCanonicalCount:number;tableCanonicalCount:number;formulaCount:number;gapCount:number;checksum:string;checksumReproducible:boolean;existingCanonicalBaseline:number;totalFlightTheoryCanonical:number;mutations:Record<string,number>};
const root=process.cwd();const load=<T>(p:string)=>JSON.parse(readFileSync(join(root,p),"utf8")) as T;
describe("FLIGHT-THEORY-004D Canonical",()=>{
 const set=load<Set>("work/flight-theory-validation/004d/results/canonical-flight-knowledge-004d.json");const summary=load<Summary>("work/flight-theory-validation/004d/results/canonical-summary.json");const all=[...set.canonicalUnits,...set.relationshipUnits];
 it("uses exactly the 20 validated candidates",()=>{expect(summary.canonicalInput).toBe(20);expect(summary.canonicalGenerated).toBe(20);expect(summary.candidateStatus).toEqual({READY_WITH_WARNING:12,READY:8});});
 it("creates deterministic unique IDs",()=>{expect(new Set(all.map(x=>x.knowledgeId)).size).toBe(20);expect(all.every(x=>x.knowledgeId.startsWith("flight-004d:"))).toBe(true);expect(summary.checksumReproducible).toBe(true);expect(summary.checksum).toBe(set.checksum);});
 it("remaps every relationship endpoint",()=>{const ids=new Set(all.map(x=>x.knowledgeId));expect(set.relationshipUnits).toHaveLength(6);expect(set.relationshipUnits.every(x=>Boolean(x.sourceCanonicalId&&x.targetCanonicalId&&ids.has(x.sourceCanonicalId)&&ids.has(x.targetCanonicalId)))).toBe(true);});
 it("does not promote UAS-specific or synthesize protected concepts",()=>{const ids=all.map(x=>x.knowledgeId).join(" ").toLowerCase();expect(summary.uasSpecificCount).toBe(0);expect(all.every(x=>x.technicalContext!=="UAS_SPECIFIC")).toBe(true);for(const forbidden of [":imu:","sensor-fusion","return-to-home","home-point","position-hold","altitude-hold","geofencing"])expect(ids.includes(forbidden)).toBe(false);});
 it("keeps visual, table and formula outside Canonical Knowledge",()=>{expect(summary.visualCanonicalCount).toBe(0);expect(summary.tableCanonicalCount).toBe(0);expect(summary.formulaCount).toBe(0);expect(set.visualSupportIds).toHaveLength(1);expect(set.unresolvedTableIds).toHaveLength(1);});
 it("preserves all gaps and existing Canonical baseline",()=>{expect(summary.gapCount).toBe(14);expect(set.gapAnalysis.count).toBe(14);expect(summary.existingCanonicalBaseline).toBe(180);expect(summary.totalFlightTheoryCanonical).toBe(200);});
 it("does not mutate external runtimes",()=>{expect(Object.values(summary.mutations).every(v=>v===0)).toBe(true);expect(existsSync(join(root,"work/flight-theory-validation/004d/results/canonical-flight-knowledge-004d.json"))).toBe(true);});
});
