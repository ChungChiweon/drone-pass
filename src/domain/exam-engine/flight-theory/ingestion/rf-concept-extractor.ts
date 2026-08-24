export type RfTechnicalContext="RF_GENERAL"|"COMMUNICATION_GENERAL"|"AVIATION_COMMUNICATION"|"UAS_SPECIFIC"|"REGULATORY_ONLY"|"UNKNOWN";
export type RfConcept={conceptId:string;name:string;definition:string;mechanism?:string;conditions:string[];limitations:string[];sourceReferences:Array<{sourceId:string;page:number;section:string}>;rawEvidence:string;technicalContext:RfTechnicalContext;confidence:number};
export function extractRfConcept(input:RfConcept):RfConcept{return structuredClone(input);}
export function isUnsupportedRfGeneralization(text:string){return /drone controller|telemetry|\bfpv\b|lost.?link|failsafe|return.to.home|\brth\b|exact range/i.test(text);}
