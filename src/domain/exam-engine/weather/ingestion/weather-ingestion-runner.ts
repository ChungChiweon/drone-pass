import { extractWeatherConcepts } from "./weather-concept-extractor";
import { extractWeatherHazards } from "./weather-hazard-extractor";
import { extractWeatherObservations } from "./weather-observation-extractor";
import { extractWeatherOperationalImpacts } from "./weather-operational-impact-extractor";
import { extractWeatherPhenomena } from "./weather-phenomenon-extractor";
import { buildWeatherRelationships } from "./weather-relationship-builder";
import type { WeatherIngestionInput, WeatherIngestionResult } from "./weather-ingestion-types";
import { linkWeatherVisuals } from "./weather-visual-linker";

export function runWeatherIngestion(input: WeatherIngestionInput): WeatherIngestionResult {
  const warnings: string[] = [];
  const errors: string[] = [];
  if (!input.document.pages.length) warnings.push("SOURCE_TEXT_EMPTY");
  if (input.source.currentnessStatus === "POSSIBLY_OUTDATED") warnings.push("SOURCE_POSSIBLY_OUTDATED");

  const concepts = extractWeatherConcepts(input.document, input.taxonomy);
  const phenomena = extractWeatherPhenomena(input.document, input.taxonomy);
  const hazards = extractWeatherHazards(input.document, input.taxonomy);
  const observations = extractWeatherObservations(input.document, input.taxonomy);
  const operationalImpacts = extractWeatherOperationalImpacts(input.document, input.taxonomy);
  const relationships = buildWeatherRelationships(input.document, input.relationshipRules);
  const topicKnowledgeIds = new Map<string, string[]>();
  for (const item of input.taxonomy) {
    const ids = topicKnowledgeIds.get(item.topic) ?? [];
    ids.push(item.knowledgeId);
    topicKnowledgeIds.set(item.topic, ids);
  }
  const visualLinks = linkWeatherVisuals(
    input.visualInventory.filter((asset) => asset.sourceId === input.source.sourceId),
    topicKnowledgeIds,
  );
  const totalRules = input.taxonomy.filter((rule) => !rule.sourceIds || rule.sourceIds.includes(input.source.sourceId)).length;
  const extracted = concepts.length + phenomena.length + hazards.length + observations.length + operationalImpacts.length;
  const extractionQuality = totalRules ? Math.min(1, extracted / totalRules) : 0;
  const status = errors.length
    ? "FAILED"
    : !input.document.pages.length
      ? "PARTIAL"
      : warnings.length
        ? "COMPLETED_WITH_WARNINGS"
        : "COMPLETED";

  return {
    jobId: `weather-ingest:${input.source.sourceId}`,
    sourceId: input.source.sourceId,
    sectionsProcessed: input.document.pages.reduce((sum, page) => sum + page.sections.length, 0),
    pagesProcessed: input.document.pages.length,
    concepts,
    phenomena,
    hazards,
    observations,
    weatherCodes: [],
    operationalImpacts,
    relationships,
    visualLinks,
    warnings,
    errors,
    extractionQuality,
    status,
  };
}
