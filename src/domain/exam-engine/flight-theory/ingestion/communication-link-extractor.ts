import {isUnsupportedRfGeneralization,type RfTechnicalContext} from "./rf-concept-extractor";
export type CommunicationLinkKnowledge={linkId:string;linkType:"RADIO_LINK"|"DATA_LINK";definition:string;sourceReferences:Array<{sourceId:string;page:number;section:string}>;rawEvidence:string;technicalContext:RfTechnicalContext;confidence:number};
export function extractCommunicationLink(input:CommunicationLinkKnowledge){if(isUnsupportedRfGeneralization(input.definition))throw new Error("UNSUPPORTED_UAS_LINK_GENERALIZATION");return structuredClone(input);}
