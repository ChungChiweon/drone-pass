import type {OperationalDecision} from "./operational-ingestion-types";
export function extractOperationalDecision(input:OperationalDecision):OperationalDecision|null{return input.trigger.trim()&&input.decision.trim()&&input.rawEvidenceText.trim()?{...input,alternatives:[...input.alternatives],limitations:[...input.limitations]}:null;}
