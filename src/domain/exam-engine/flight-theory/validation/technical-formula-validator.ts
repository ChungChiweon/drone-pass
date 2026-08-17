import type { FormulaValidationStatus } from "./flight-004c-validation-types";
export type TechnicalFormulaLike = { formulaId?:string; rawExpression?:string; normalizedExpression?:string; variables?:string[]; units?:string[]; rawEvidenceText?:string; sourceReferences?:Array<{sourceId?:string;page?:number;section?:string}> };
export function validateTechnicalFormula(item: TechnicalFormulaLike): { formulaId:string; status:FormulaValidationStatus; blockers:string[]; score:number } {
  const source=item.sourceReferences?.[0]; const blockers:string[]=[];
  const normalize=(value:string)=>value.toLowerCase().replace(/²/g,"2").replace(/[\s*]/g,"");
  if(!item.rawExpression || !normalize(item.rawEvidenceText??"").includes(normalize(item.rawExpression))) blockers.push("FORMULA_NOT_PRESENT_IN_EVIDENCE");
  if(!item.normalizedExpression || !item.variables?.length || !item.units?.length) blockers.push("INCOMPLETE_FORMULA_STRUCTURE");
  if(!source?.sourceId || !source.page) blockers.push("MISSING_SOURCE_LOCATOR");
  if(/\b(kv|lipo|propeller)\b/i.test(item.rawExpression??"")) blockers.push("UNSUPPORTED_FORMULA_DOMAIN");
  return { formulaId:item.formulaId??"", status:blockers.length?"BLOCKED_FORMULA":"FORMULA_VALIDATED", blockers, score:blockers.length?0:1 };
}
