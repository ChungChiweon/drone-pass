import type { WeatherHazard } from "../knowledge";
import { findEvidence } from "./weather-document-parser";
import type { NormalizedWeatherDocument, WeatherTaxonomyRule } from "./weather-ingestion-types";

export function extractWeatherHazards(document: NormalizedWeatherDocument, rules: readonly WeatherTaxonomyRule[]): WeatherHazard[] {
  return rules.filter((rule) => rule.kind === "hazard").flatMap((rule) => {
    const evidence = findEvidence(document, rule, /(위험|경보|특보|영향|강풍|호우|뇌우|착빙|난류|급변풍|저시정)/);
    return evidence ? [{
      hazardId: rule.knowledgeId,
      name: rule.name,
      triggerConditions: [],
      severityFactors: [],
      warningSigns: [evidence.text],
      affectedOperations: [],
      flightRisks: [],
      avoidanceGuidance: [],
      relatedPhenomenonIds: [],
      rawEvidenceText: evidence.text,
      sourceReferences: [evidence.locator],
      examRelevance: "REVIEW_REQUIRED",
    }] : [];
  });
}
