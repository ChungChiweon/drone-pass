import type {TechnicalContext,TechnicalSourceReference} from "./electrical-concept-extractor";
export type PropulsionComponent={componentId:string;name:string;function:string;sourceReferences:TechnicalSourceReference[];rawEvidenceText:string;confidence:number;technicalContext:TechnicalContext;topicId:string};
export function extractPropulsionComponent(input:Omit<PropulsionComponent,"componentId">){if(!input.rawEvidenceText.trim())throw new Error("DIRECT_SOURCE_EVIDENCE_REQUIRED");return {...input,componentId:`propulsion-component:${input.topicId.replace("flight:","")}`}}
