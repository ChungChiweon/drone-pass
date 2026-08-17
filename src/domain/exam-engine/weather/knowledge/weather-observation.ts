import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherObservation = {
  observationId: string;
  observationType: string;
  measuredVariables: string[];
  units: string[];
  instrument?: string;
  observationMethod?: string[];
  interpretation: string[];
  codeStructure?: string[];
  thresholds: string[];
  examples?: string[];
  sourceReferences: WeatherSourceLocator[];
  visualAssetIds: string[];
};
