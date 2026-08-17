import type {
  NormalizedWeatherDocument,
  NormalizedWeatherPage,
  WeatherEvidence,
  WeatherTaxonomyRule,
} from "./weather-ingestion-types";

export function normalizeWeatherText(text: string): string {
  return text.replace(/\u0000/g, "").replace(/[ \t]+/g, " ").replace(/\r\n?/g, "\n").trim();
}

export function parseNormalizedWeatherDocument(
  sourceId: string,
  title: string,
  pages: Array<{ page: number; text: string }>,
  extractionMethod = "NORMALIZED_TEXT",
): NormalizedWeatherDocument {
  return {
    sourceId,
    title,
    extractionMethod,
    pages: pages.map((page) => ({
      page: page.page,
      text: normalizeWeatherText(page.text),
      sections: extractSectionLabels(page.text),
    })),
  };
}

function extractSectionLabels(text: string): string[] {
  return [...text.matchAll(/(?:^|\n)(\d+(?:\.\d+)*\s+[^\n]{2,80})/g)].map((match) => match[1].trim());
}

function sentences(page: NormalizedWeatherPage): string[] {
  return page.text
    .split(/(?<=[.!?。]|다\.)\s+|\n+/)
    .map((value) => value.trim())
    .filter((value) => value.length >= 12);
}

export function findEvidence(
  document: NormalizedWeatherDocument,
  rule: WeatherTaxonomyRule,
  extraPattern?: RegExp,
): WeatherEvidence | undefined {
  if (rule.sourceIds && !rule.sourceIds.includes(document.sourceId)) return undefined;
  for (const page of document.pages) {
    if (rule.pageRange && (page.page < rule.pageRange[0] || page.page > rule.pageRange[1])) continue;
    for (const sentence of sentences(page)) {
      if (!rule.aliases.some((alias) => sentence.includes(alias))) continue;
      if (extraPattern && !extraPattern.test(sentence)) continue;
      return {
        text: sentence,
        locator: { sourceId: document.sourceId, page: page.page, section: page.sections[0] },
      };
    }
  }
  return undefined;
}
