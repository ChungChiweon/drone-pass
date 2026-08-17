export type TechnicalContext="UAS_SPECIFIC"|"AVIATION_GENERAL"|"ELECTRICAL_GENERAL"|"BATTERY_GENERAL"|"UNKNOWN";
export type TechnicalSourceReference={sourceId:string;page:number;section:string};
export type TechnicalConcept={conceptId:string;name:string;definition:string;variables:string[];units:string[];relationships:string[];sourceReferences:TechnicalSourceReference[];rawEvidenceText:string;confidence:number;technicalContext:TechnicalContext;topicId:string};
export function extractElectricalConcept(input:Omit<TechnicalConcept,"conceptId">):TechnicalConcept{if(!input.rawEvidenceText.trim()||!input.sourceReferences.length)throw new Error("DIRECT_SOURCE_EVIDENCE_REQUIRED");return {...input,conceptId:`technical-concept:${input.topicId.replace("flight:","")}`}}
