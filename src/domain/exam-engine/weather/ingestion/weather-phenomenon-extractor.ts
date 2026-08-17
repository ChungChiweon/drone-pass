import type { WeatherPhenomenon } from "../knowledge";
import { findEvidence } from "./weather-document-parser";
import type { NormalizedWeatherDocument, WeatherTaxonomyRule } from "./weather-ingestion-types";

export function extractWeatherPhenomena(document: NormalizedWeatherDocument, rules: readonly WeatherTaxonomyRule[]): WeatherPhenomenon[] {
  return rules.filter((rule) => rule.kind === "phenomenon").flatMap((rule) => {
    const evidence = findEvidence(document, rule);
    return evidence ? [{
      phenomenonId: rule.knowledgeId,
      name: rule.name,
      causes: [],
      requiredConditions: [],
      developmentProcess: [],
      characteristics: [evidence.text],
      associatedWeather: [],
      indicators: [],
      rawEvidenceText: evidence.text,
      sourceReferences: [evidence.locator],
    }] : [];
  });
}
