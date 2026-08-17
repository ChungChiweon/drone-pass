import type { WeatherKnowledgeKind, WeatherValidationResult } from "../validation";

export type CanonicalWeatherKnowledgeItem = {
  knowledgeId: string;
  kind: WeatherKnowledgeKind;
  validation: WeatherValidationResult;
};

export type CanonicalWeatherKnowledgeSet = {
  generatedAt: string;
  items: CanonicalWeatherKnowledgeItem[];
  counts: Record<WeatherKnowledgeKind, number>;
};
