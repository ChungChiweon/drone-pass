import type { WeatherValidationResult } from "../validation";
import type { CanonicalWeatherKnowledgeSet } from "./canonical-weather-knowledge";

export function buildCanonicalWeatherKnowledgeSet(
  results: readonly WeatherValidationResult[],
  generatedAt = new Date().toISOString(),
): CanonicalWeatherKnowledgeSet {
  const accepted = results.filter((result) => result.status === "VALIDATED" || result.status === "VALIDATED_WITH_WARNING");
  const counts = { concept: 0, phenomenon: 0, hazard: 0, observation: 0,
    "weather-code": 0, "operational-impact": 0, relationship: 0 };
  for (const item of accepted) counts[item.kind] += 1;
  return { generatedAt, items: accepted.map((validation) => ({
    knowledgeId: validation.knowledgeId, kind: validation.kind, validation,
  })), counts };
}
