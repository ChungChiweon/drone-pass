import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { validateBatteryKnowledge } from "./battery-knowledge-validator";
import { validateTechnicalFormula } from "./technical-formula-validator";
import { validateTechnicalTable } from "./technical-table-validator";
import { validateTechnicalVisualSupport } from "./technical-visual-support-validator";

const root=process.cwd();
const load=<T>(path:string)=>JSON.parse(readFileSync(join(root,path),"utf8")) as T;
type Summary={rawInputCount:number;knowledgeValidationInputCount:number;visualValidationInputCount:number;tableValidationInputCount:number;lipoGapPreserved:boolean;cRateValidated:boolean;gapCount:number;gaps:string[];unsupportedInferenceCount:number;canonicalBaseline:number;canonicalGenerated:boolean;mutations:Record<string,number>};
type InventoryItem={canonicalId:string|null};
type TableInput={tableId:string;sourceId:string;page:number;headers:string[];knowledgeIds:string[];interpretationRequired:boolean;status:string};
type BoundaryItem={classification:string};

describe("FLIGHT-THEORY-004C validation",()=>{
  const summary=load<Summary>("work/flight-theory-validation/004c/results/validation-summary.json");
  const inventory=load<InventoryItem[]>("work/flight-theory-validation/004c/results/canonical-candidate-inventory.json");
  it("separates primary knowledge, visual support, and blocked tables",()=>{
    expect(summary.rawInputCount).toBe(133);
    expect(summary.knowledgeValidationInputCount).toBe(29);
    expect(summary.visualValidationInputCount).toBe(102);
    expect(summary.tableValidationInputCount).toBe(2);
  });
  it("does not let an unresolved supportive visual block knowledge",()=>{
    const result=validateTechnicalVisualSupport({assetId:"v1",topicId:"flight:voltage",sourceLocator:{sourceId:"s",page:1},visualSupportType:"SUPPORTIVE",interpretationRequired:true});
    expect(result.status).toBe("SUPPORTIVE_UNRESOLVED"); expect(result.blocksKnowledge).toBe(false);
  });
  it("blocks Li-ion to LiPo context generalization",()=>{
    const result=validateBatteryKnowledge({knowledgeId:"b",title:"LiPo operation",statement:"LiPo rule",batteryContext:"GENERAL_LITHIUM_ION",technicalContext:"BATTERY_GENERAL",sourceReferences:[{sourceId:"nasa",page:1,section:"s"}],rawEvidenceText:"evidence"});
    expect(result.blockers).toContain("BLOCKED_CONTEXT_GENERALIZATION");
    expect(summary.lipoGapPreserved).toBe(true);
  });
  it("validates C-rate evidence and only source-present formulas",()=>{
    expect(summary.cRateValidated).toBe(true);
    expect(validateTechnicalFormula({formulaId:"f",rawExpression:"P = I² × R",normalizedExpression:"P=I^2*R",variables:["P","I","R"],units:["W","A","Ω"],rawEvidenceText:"P = I2 × R",sourceReferences:[{sourceId:"faa",page:436,section:"power"}]}).status).toBe("FORMULA_VALIDATED");
    expect(validateTechnicalFormula({formulaId:"kv",rawExpression:"KV = RPM/V",normalizedExpression:"KV=RPM/V",variables:["KV"],units:["rpm/V"],rawEvidenceText:"motor",sourceReferences:[{sourceId:"faa",page:1,section:"motor"}]}).status).toBe("BLOCKED_FORMULA");
  });
  it("keeps exactly two unresolved tables in limited review",()=>{
    const tables=load<TableInput[]>("work/flight-theory-validation/004c/tables.json");
    expect(tables).toHaveLength(2);
    expect(tables.map(validateTechnicalTable).every(x=>x.status==="PAGE_REVIEW_REQUIRED")).toBe(true);
  });
  it("records 004B/004G boundaries without Canonical IDs or mutation",()=>{
    const boundary=load<BoundaryItem[]>("work/flight-theory-validation/004c/results/duplicate-boundary-analysis.json");
    expect(boundary.map(x=>x.classification)).toEqual(expect.arrayContaining(["SAME_ENTITY_DIFFERENT_ROLE","TECHNICAL_VS_EMERGENCY_ROLE"]));
    expect(inventory).toHaveLength(29); expect(inventory.every(x=>x.canonicalId===null)).toBe(true);
    expect(summary.canonicalGenerated).toBe(false); expect(Object.values(summary.mutations).every(x=>x===0)).toBe(true);
  });
  it("preserves all seven explicit gaps and the frozen baseline",()=>{
    expect(summary.gapCount).toBe(7); expect(summary.gaps).toContain("flight:lipo"); expect(summary.gaps).toContain("flight:kv");
    expect(summary.unsupportedInferenceCount).toBe(0); expect(summary.canonicalBaseline).toBe(151);
  });
});
