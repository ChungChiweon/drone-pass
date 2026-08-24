import type {RfTechnicalContext} from "./rf-concept-extractor";
export type CommunicationComponent={componentId:string;componentType:"TRANSMITTER"|"RECEIVER"|"ANTENNA";function:string;limitations:string[];sourceReferences:Array<{sourceId:string;page:number;section:string}>;rawEvidence:string;technicalContext:RfTechnicalContext;confidence:number};
export function extractCommunicationComponent(input:CommunicationComponent){return structuredClone(input);}
