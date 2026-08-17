import type {ShadowExamFact} from "../../shadow-pack";
export type LegalTemplateId="CONDITION_SELECTION"|"EXCEPTION_SELECTION"|"RANGE_COMPARISON"|"CATEGORY_COMPARISON"|"PENALTY_MATCHING"|"PROCEDURE_ORDER"|"COMPOSITE_CASE"|"RULE_COMPARISON";
export type LegalTemplateDefinition={id:LegalTemplateId;required:(fact:ShadowExamFact,context:LegalTemplateContext)=>boolean;stemFamilies:Array<{id:string;contract:string;requiredFields:string[];stem:(fact:ShadowExamFact)=>string}>};
export type LegalTemplateContext={siblings:ShadowExamFact[];relationTypes:string[];compositeMemberIds:string[]};
export type LegalTemplateEligibility={knowledgeId:string;eligibleTemplates:LegalTemplateId[];rejectedTemplates:LegalTemplateId[];rejectionReasons:Partial<Record<LegalTemplateId,string>>;templateEvidence:Record<string,string[]>};
