import type { LegalCandidateInput, RuleScore } from "./legal-validation-types";
const OPS:[[RegExp,string],...Array<[RegExp,string]>]=[[/이상/,"GTE"],[/이하/,"LTE"],[/초과/,"GT"],[/미만/,"LT"],[/이내/,"WITHIN"],[/이전|\b전\b/,"BEFORE"],[/이후/,"AFTER"],[/총|합계/,"AGGREGATE"],[/각각/,"PER_ITEM"]];
export function validateLegalNumeric(c:LegalCandidateInput):RuleScore {const raw=c.rawEvidenceText??"",passed:string[]=[],failed:string[]=[],warnings:string[]=[],blockers:string[]=[],evidence:string[]=[];const numbers=[...raw.matchAll(/\d+(?:\.\d+)?/g)].map(x=>Number(x[0]));
  const numericClaim=c.factType==="NUMERIC_THRESHOLD"||c.value!=null||Boolean(c.unit)||(Boolean(c.operator)&&c.operator!=="NONE")||/\d+(?:\.\d+)?\s*(?:kg|g|m|cm|km|원|만원|억원|시간|분|일|개월|년|%)(?:\s*(?:이상|이하|초과|미만|이내))?/i.test(raw);
  if(!numbers.length||!numericClaim)return{score:1,passedRules:["NO_SUBSTANTIVE_NUMERIC_CLAIM"],failedRules:[],warnings:[],blockers:[],evidence:[]};
  const structured=c.value!=null||c.unit||c.operator&&c.operator!=="NONE";if(structured)passed.push("NUMERIC_STRUCTURE_PRESENT");else{failed.push("NUMERIC_STRUCTURE_PRESENT");warnings.push("UNSTRUCTURED_NUMERIC_EVIDENCE");}
  const expected=OPS.filter(([p])=>p.test(raw)).map(([,op])=>op);if(expected.length&&c.operator&&c.operator!=="NONE"&&!expected.includes(c.operator)){failed.push("OPERATOR_PRESERVED");blockers.push("OPERATOR_CONFLICT");}else passed.push("OPERATOR_PRESERVED");
  if(c.value!=null&&!numbers.some(n=>n===Number(c.value))){failed.push("VALUE_PRESERVED");blockers.push("NUMERIC_VALUE_MISMATCH");}else passed.push("VALUE_PRESERVED");
  if(/[0-9]\s*(kg|g|m|cm|km|원|만원|억|시간|분|일|개월|년|%)/i.test(raw)&&!c.unit)warnings.push("UNIT_NOT_STRUCTURED");
  evidence.push(numbers.join(","));return{score:Math.max(0,1-blockers.length*.5-warnings.length*.05),passedRules:passed,failedRules:failed,warnings,blockers,evidence};}
