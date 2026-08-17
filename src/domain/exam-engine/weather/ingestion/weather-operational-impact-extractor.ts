import type { WeatherOperationalImpact } from "../knowledge";
import type { NormalizedWeatherDocument, WeatherTaxonomyRule } from "./weather-ingestion-types";

const DIRECT_OPERATIONAL_LANGUAGE = /(운항|비행|항공기|이착륙|접근|조종)/;

function findOperationalEvidence(document: NormalizedWeatherDocument, rule: WeatherTaxonomyRule) {
  if (rule.sourceIds && !rule.sourceIds.includes(document.sourceId)) return undefined;
  for (const page of document.pages) {
    if (rule.pageRange && (page.page < rule.pageRange[0] || page.page > rule.pageRange[1])) continue;
    for (const paragraph of page.text.split(/\n+/).map((value) => value.trim())) {
      if (!rule.aliases.some((alias) => paragraph.includes(alias))) continue;
      if (!DIRECT_OPERATIONAL_LANGUAGE.test(paragraph)) continue;
      return { text: paragraph, locator: { sourceId: document.sourceId, page: page.page, section: page.sections[0] } };
    }
  }
  return undefined;
}

export function extractWeatherOperationalImpacts(
  document: NormalizedWeatherDocument,
  rules: readonly WeatherTaxonomyRule[],
): WeatherOperationalImpact[] {
  return rules.filter((rule) => rule.kind === "operational-impact").flatMap((rule) => {
    const evidence = findOperationalEvidence(document, rule);
    if (!evidence) return [];
    return [{
      impactId: rule.knowledgeId,
      weatherEntityId: rule.topic,
      aircraftContext: rule.aircraftContext ?? "SOURCE_STATED_AIRCRAFT_CONTEXT",
      operationalEffect: evidence.text,
      riskLevel: "NOT_ASSESSED",
      decisionGuidance: [],
      limitations: ["The source statement is not generalized to drone-specific operating limits."],
      sourceReferences: [evidence.locator],
      rawEvidenceText: evidence.text,
      confidence: 0.8,
    }];
  });
}
