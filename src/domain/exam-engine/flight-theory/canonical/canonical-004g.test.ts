import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";
import {buildCanonicalFlight004G} from "./canonical-flight-builder";

const input=(generatedAt:string)=>({version:"1" as const,batchId:"004G" as const,canonicalUnits:[],relationshipUnits:[],warningIds:[],excludedIds:[],topicCoverage:[],runtimeReadiness:{status:"READY_WITH_GAPS"},sourceSnapshot:{checksum:"fixed"},generatedAt});

describe("004G canonical builder",()=>{
  it("excludes generatedAt from its deterministic checksum",()=>expect(buildCanonicalFlight004G(input("a")).checksum).toBe(buildCanonicalFlight004G(input("b")).checksum));
  it("keeps 004G detached from active runtime",()=>expect(buildCanonicalFlight004G(input("fixed")).batchId).toBe("004G"));
  it("preserves validated boundaries in the generated artifact",()=>{
    const root=join(process.cwd(),"work/flight-theory-validation/004g/results");
    const set=JSON.parse(readFileSync(join(root,"canonical-flight-knowledge-004g.json"),"utf8"));
    const exclusions=JSON.parse(readFileSync(join(root,"canonical-exclusions.json"),"utf8"));
    const units=[...set.canonicalUnits,...set.relationshipUnits];
    expect(units).toHaveLength(26);
    expect(set.relationshipUnits).toHaveLength(1);
    expect(exclusions.blockedRelationships).toHaveLength(5);
    expect(exclusions.duplicates).toHaveLength(1);
    const procedure=units.find((unit:{knowledgeType:string})=>unit.knowledgeType==="EMERGENCY_PROCEDURE");
    expect(procedure.ordered).toBe(false);
    expect(procedure.supportedQuestionTypes).not.toContain("PROCEDURE_ORDER");
    const fire=units.find((unit:{sourceRecordId:string})=>unit.sourceRecordId==="flight-emergency-safety:battery-fire");
    expect(fire.constraints.allowFireSuppressionProcedure).toBe(false);
    const landing=units.find((unit:{sourceRecordId:string})=>unit.sourceRecordId==="flight-emergency-concept:emergency-landing-capability");
    expect(landing.constraints.allowProcedureQuestion).toBe(false);
  });
});
