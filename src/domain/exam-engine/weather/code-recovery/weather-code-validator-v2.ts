import type { WeatherCodeDefinition } from "../knowledge";
import type { WeatherCodeDependency, WeatherCodeEvidence, WeatherCodeExample, WeatherCodePositionRule } from "./weather-code-evidence-map";

export type WeatherCodeValidationV2Status = "VALIDATED" | "VALIDATED_WITH_WARNING" |
  "BLOCKED_SOURCE" | "BLOCKED_STRUCTURE" | "BLOCKED_EXAMPLE" | "BLOCKED_DEPENDENCY";

export type WeatherCodeValidationV2 = {
  codeId: string;
  status: WeatherCodeValidationV2Status;
  blockers: string[];
  warnings: string[];
};

const POSITION_REQUIRED = new Set(["METAR", "SPECI", "TAF", "RMK"]);
const DEPENDENCY_REQUIRED = new Set(["RMK"]);

export function validateWeatherCodeV2(
  code: WeatherCodeDefinition,
  evidence: readonly WeatherCodeEvidence[],
  positions: readonly WeatherCodePositionRule[],
  dependencies: readonly WeatherCodeDependency[],
  examples: readonly WeatherCodeExample[],
): WeatherCodeValidationV2 {
  const codeId = `weather-code:${code.codeType.toLowerCase()}:${code.token.toLowerCase()}`;
  const direct = new Set(evidence.filter((item) => item.codeId === codeId && item.supportStatus === "DIRECT").map((item) => item.fieldName));
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!direct.has("token") || !direct.has("meaning") || !direct.has("valueType")) blockers.push("CORE_DIRECT_EVIDENCE_MISSING");
  if (!examples.some((item) => item.targetCodeId === codeId && item.validationStatus === "SOURCE_VERIFIED")) blockers.push("OFFICIAL_EXAMPLE_MISSING");
  const rules = positions.filter((item) => item.codeId === codeId);
  if (POSITION_REQUIRED.has(code.codeType) && !rules.some((rule) => rule.ruleStrength === "STRICT")) blockers.push("STRICT_POSITION_RULE_MISSING");
  if (rules.some((rule) => rule.ruleStrength === "EXAMPLE_ORDER_ONLY")) warnings.push("EXAMPLE_ORDER_ONLY");
  if (DEPENDENCY_REQUIRED.has(code.codeType) && !dependencies.some((item) => item.codeId === codeId)) blockers.push("DEPENDENCY_EVIDENCE_MISSING");
  if (!direct.has("units")) warnings.push("UNIT_NOT_APPLICABLE_OR_NOT_FOUND");
  const status = blockers.includes("OFFICIAL_EXAMPLE_MISSING") ? "BLOCKED_EXAMPLE" :
    blockers.includes("DEPENDENCY_EVIDENCE_MISSING") ? "BLOCKED_DEPENDENCY" :
    blockers.length ? "BLOCKED_STRUCTURE" : warnings.length ? "VALIDATED_WITH_WARNING" : "VALIDATED";
  return { codeId, status, blockers, warnings };
}
