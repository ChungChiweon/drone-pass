import type {RfTechnicalContext} from "./rf-concept-extractor";
export type InterferenceKnowledge={knowledgeId:string;phenomenon:string;effect:string;limitations:string[];sourceReferences:Array<{sourceId:string;page:number;section:string}>;rawEvidence:string;technicalContext:RfTechnicalContext;confidence:number};
export function extractInterferenceKnowledge(input:InterferenceKnowledge){return structuredClone(input);}
