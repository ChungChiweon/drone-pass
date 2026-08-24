import type { WeatherConcept } from "../knowledge";
import { findEvidence } from "./weather-document-parser";
import type { NormalizedWeatherDocument, WeatherTaxonomyRule } from "./weather-ingestion-types";

export function extractWeatherConcepts(
  document: NormalizedWeatherDocument,
  rules: readonly WeatherTaxonomyRule[],
): WeatherConcept[] {
  return rules.filter((rule) => rule.kind === "concept").flatMap((rule) => {
    const evidence = findEvidence(document, rule);
    if (!evidence) return [];
    return [{
      conceptId: rule.knowledgeId,
      name: rule.name,
      definition: evidence.text,
      normalizedDefinition: evidence.text,
      rawEvidenceText: evidence.text,
      keyProperties: [],
      variables: rule.measuredVariables ?? [],
      units: rule.units ?? [],
      formulas: [],
      conditions: [],
      relatedConcepts: [],
      examples: [],
      misconceptions: [],
      sourceReferences: [evidence.locator],
      topic: rule.topic,
      difficulty: "UNASSESSED",
      confidence: 0.85,
    }];
  });
}
