import type {BatteryKnowledge} from "./battery-knowledge-extractor";
export function extractBatterySafety(input:Omit<BatteryKnowledge,"knowledgeId">){if(!/overcharge|short|thermal runaway|heat|fire|safety/i.test(input.rawEvidenceText))throw new Error("SAFETY_EVIDENCE_REQUIRED");return {...input,knowledgeId:`battery-safety:${input.topicId.replace("flight:","")}`}}
