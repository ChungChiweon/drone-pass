import type {TechnicalConcept} from "./electrical-concept-extractor";
export function extractPowerSystem(input:Omit<TechnicalConcept,"conceptId">){if(!/power|electrical|battery|load/i.test(input.rawEvidenceText))throw new Error("POWER_SYSTEM_EVIDENCE_REQUIRED");return {...input,conceptId:`power-system:${input.topicId.replace("flight:","")}`}}
