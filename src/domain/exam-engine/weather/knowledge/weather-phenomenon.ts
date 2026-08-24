import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherPhenomenon = {
  phenomenonId: string;
  name: string;
  causes: string[];
  requiredConditions: string[];
  developmentProcess: string[];
  characteristics: string[];
  associatedWeather: string[];
  duration?: string;
  spatialScale?: string;
  indicators: string[];
  rawEvidenceText?: string;
  sourceReferences: WeatherSourceLocator[];
};
