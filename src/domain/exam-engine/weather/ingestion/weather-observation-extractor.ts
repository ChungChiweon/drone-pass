import type { WeatherObservation } from "../knowledge";
import { findEvidence } from "./weather-document-parser";
import type { NormalizedWeatherDocument, WeatherTaxonomyRule } from "./weather-ingestion-types";

export function extractWeatherObservations(document: NormalizedWeatherDocument, rules: readonly WeatherTaxonomyRule[]): WeatherObservation[] {
  return rules.filter((rule) => rule.kind === "observation").flatMap((rule) => {
    const evidence = findEvidence(document, rule, /(관측|측정|보고|자료|영상)/);
    return evidence ? [{
      observationId: rule.knowledgeId,
      observationType: rule.name,
      measuredVariables: rule.measuredVariables ?? [],
      units: rule.units ?? [],
      instrument: rule.instrument,
      observationMethod: [evidence.text],
      interpretation: [],
      codeStructure: [],
      thresholds: [],
      examples: [],
      sourceReferences: [evidence.locator],
      visualAssetIds: [],
    }] : [];
  });
}
