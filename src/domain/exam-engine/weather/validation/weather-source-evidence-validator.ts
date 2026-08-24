import type { WeatherKnowledge } from "./weather-validation-types";

type Reference = { sourceId?: string; page?: number | null; section?: string };

export function getWeatherSourceReferences(knowledge: WeatherKnowledge): Reference[] {
  if ("sourceReferences" in knowledge) return knowledge.sourceReferences;
  if ("sourceLocator" in knowledge && knowledge.sourceLocator) return [knowledge.sourceLocator];
  return [];
}

export function validateWeatherSourceEvidence(
  knowledge: WeatherKnowledge,
  validSourceIds: ReadonlySet<string>,
) {
  const references = getWeatherSourceReferences(knowledge);
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!references.length) blockers.push("SOURCE_REFERENCE_MISSING");
  if (references.some((reference) => !reference.sourceId || !validSourceIds.has(reference.sourceId))) {
    blockers.push("SOURCE_NOT_VALIDATED");
  }
  if (references.some((reference) => reference.page == null && !reference.section)) {
    warnings.push("SOURCE_LOCATOR_INCOMPLETE");
  }
  return { blockers, warnings };
}
