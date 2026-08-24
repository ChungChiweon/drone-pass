import type { WeatherRelationship } from "../knowledge";
import type { NormalizedWeatherDocument, WeatherRelationshipRule } from "./weather-ingestion-types";

export function buildWeatherRelationships(
  document: NormalizedWeatherDocument,
  rules: readonly WeatherRelationshipRule[],
): WeatherRelationship[] {
  return rules.flatMap((rule) => {
    for (const page of document.pages) {
      const evidence = page.text
        .split(/(?<=[.!?。]|다\.)\s+|\n+/)
        .map((value) => value.trim())
        .find((sentence) =>
          rule.sourceAliases.some((alias) => sentence.includes(alias))
          && rule.targetAliases.some((alias) => sentence.includes(alias)),
        );
      if (!evidence) continue;
      return [{
        relationId: `${document.sourceId}:${rule.sourceKnowledgeId}:${rule.relationType}:${rule.targetKnowledgeId}`,
        fromId: rule.sourceKnowledgeId,
        toId: rule.targetKnowledgeId,
        relationType: rule.relationType,
        sourceIds: [document.sourceId],
        evidence,
        sourceLocator: { sourceId: document.sourceId, page: page.page, section: page.sections[0] },
        confidence: 0.8,
      }];
    }
    return [];
  });
}
