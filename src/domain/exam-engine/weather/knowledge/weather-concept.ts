import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherConcept = {
  conceptId: string;
  name: string;
  definition: string;
  normalizedDefinition?: string;
  rawEvidenceText?: string;
  keyProperties: string[];
  variables: string[];
  units: string[];
  formulas: string[];
  conditions: string[];
  relatedConcepts?: string[];
  examples: string[];
  misconceptions: string[];
  sourceReferences: WeatherSourceLocator[];
  topic: string;
  difficulty: string;
  confidence: number;
};
