export type CommunicationVisualLink={assetId:string;sourceId:string;page:number;topicId:string;knowledgeIds:string[];visualSupportType:"SUPPORTIVE"|"REQUIRED";interpretationRequired:boolean};
export function linkCommunicationVisual(input:CommunicationVisualLink){return structuredClone(input);}
