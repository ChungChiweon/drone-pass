import type {LegalTemplateEligibility,LegalTemplateId} from "./legal-template-types";
const priority:LegalTemplateId[]=["PENALTY_MATCHING","EXCEPTION_SELECTION","RANGE_COMPARISON","PROCEDURE_ORDER","COMPOSITE_CASE","RULE_COMPARISON","CATEGORY_COMPARISON","CONDITION_SELECTION"];
export function selectLegalTemplate(eligibility:LegalTemplateEligibility,usage:Partial<Record<LegalTemplateId,number>>={}){return [...eligibility.eligibleTemplates].sort((a,b)=>(usage[a]??0)-(usage[b]??0)||priority.indexOf(a)-priority.indexOf(b))[0]}
