import type { WeatherCodeDefinition, WeatherOperationalImpact, WeatherRelationship } from "../knowledge";
import { validateWeatherSourceEvidence } from "./weather-source-evidence-validator";
import {
  validateGenericStructure,
  validateOperationalImpactStructure,
  validateRelationshipStructure,
  validateWeatherCodeStructure,
  weatherKnowledgeId,
} from "./weather-validators";
import type {
  WeatherKnowledge,
  WeatherKnowledgeKind,
  WeatherValidationContext,
  WeatherValidationResult,
} from "./weather-validation-types";

export type WeatherValidationInput = { kind: WeatherKnowledgeKind; knowledge: WeatherKnowledge };

export function runWeatherValidation(
  inputs: readonly WeatherValidationInput[],
  context: WeatherValidationContext,
): WeatherValidationResult[] {
  return inputs.map(({ kind, knowledge }) => {
    const evidence = validateWeatherSourceEvidence(knowledge, context.validSourceIds);
    const structure = kind === "weather-code" ? validateWeatherCodeStructure(knowledge as WeatherCodeDefinition)
      : kind === "operational-impact" ? validateOperationalImpactStructure(knowledge as WeatherOperationalImpact)
      : kind === "relationship" ? validateRelationshipStructure(knowledge as WeatherRelationship, context)
      : validateGenericStructure(knowledge, kind);
    const blockers = [...evidence.blockers, ...structure.blockers];
    const warnings = [...evidence.warnings, ...structure.warnings];
    const sourceBlocked = evidence.blockers.length > 0;
    const relationshipBlocked = kind === "relationship" && blockers.length > 0;
    const status = sourceBlocked ? "BLOCKED_SOURCE" : relationshipBlocked ? "BLOCKED_RELATIONSHIP"
      : blockers.length ? "BLOCKED_STRUCTURE" : warnings.length ? "VALIDATED_WITH_WARNING" : "VALIDATED";
    const score = Math.max(0, Math.min(1, 1 - blockers.length * 0.25 - warnings.length * 0.05));
    return {
      knowledgeId: weatherKnowledgeId(knowledge), kind,
      eligibility: sourceBlocked ? "BLOCKED_SOURCE" : relationshipBlocked ? "BLOCKED_RELATIONSHIP"
        : blockers.length ? "BLOCKED_STRUCTURE" : warnings.length ? "ELIGIBLE_WITH_WARNING" : "ELIGIBLE",
      status, score, warnings, blockers,
      impactScope: kind === "operational-impact" ? validateOperationalImpactStructure(knowledge as WeatherOperationalImpact).impactScope : undefined,
    };
  });
}
