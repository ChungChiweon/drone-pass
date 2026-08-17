import { validateBatteryKnowledge } from "./battery-knowledge-validator";
import type { TechnicalKnowledgeLike } from "./flight-004c-validation-types";
export const validateBatterySafety = (item: TechnicalKnowledgeLike & { batteryContext?: string }) => ({ ...validateBatteryKnowledge(item), knowledgeType: "BATTERY_SAFETY" });
