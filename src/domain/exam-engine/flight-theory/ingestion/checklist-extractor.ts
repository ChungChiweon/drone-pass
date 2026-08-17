import type {ChecklistItem} from "./operational-ingestion-types";
export function extractChecklistItem(input:ChecklistItem):ChecklistItem|null{return input.item.trim()&&input.rawEvidenceText.trim()&&input.sourceReference.sourceId?{...input}:null;}
