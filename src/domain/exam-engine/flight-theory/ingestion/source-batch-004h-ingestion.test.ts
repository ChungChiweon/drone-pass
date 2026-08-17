import {readFileSync} from "node:fs";
import {join} from "node:path";
import {describe,expect,it} from "vitest";

const read=(name:string)=>JSON.parse(readFileSync(join(process.cwd(),"work/source-ingestion/source-batch-004h",name),"utf8"));
describe("SOURCE-BATCH-004H ingestion",()=>{
  it("uses all 21 fixed topics and creates validation input",()=>{expect(read("coverage.json")).toHaveLength(21);expect(read("ingestion-summary.json").validationReadyCount).toBeGreaterThan(0)});
  it("preserves the procedure inventory cardinality",()=>expect(read("procedure-inventory-final-classification.json")).toHaveLength(64));
  it("does not infer numeric human or maintenance thresholds",()=>{const all=[...read("human-factors.json"),...read("maintenance.json")];expect(JSON.stringify(all)).not.toMatch(/duty time|minimum rest|replacement hour/i);expect(read("ingestion-summary.json").unsupportedInferenceCount).toBe(0)});
  it("recovers deferred evidence without changing canonical runtime",()=>{expect(read("deferred-recovery.json").from004F).toHaveLength(2);expect(read("deferred-recovery.json").from004GInventory).toHaveLength(6);expect(read("ingestion-summary.json").mutationCount).toBe(0)});
});
