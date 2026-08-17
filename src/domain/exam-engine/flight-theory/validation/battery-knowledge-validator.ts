import { validateTechnicalKnowledge, type TechnicalKnowledgeLike } from "./flight-004c-validation-types";
export function validateBatteryKnowledge(item: TechnicalKnowledgeLike & { batteryContext?: string }) {
  const result = validateTechnicalKnowledge(item, "BATTERY_KNOWLEDGE", "BATTERY_GENERAL");
  if (!item.batteryContext) return { ...result, status: "BLOCKED" as const, score: 0, blockers: [...result.blockers, "MISSING_BATTERY_CONTEXT"] };
  if (item.batteryContext === "GENERAL_LITHIUM_ION" && /lipo/i.test(`${item.title ?? ""} ${item.statement ?? ""}`)) return { ...result, status: "BLOCKED" as const, score: 0, blockers: [...result.blockers, "BLOCKED_CONTEXT_GENERALIZATION"] };
  return result;
}
