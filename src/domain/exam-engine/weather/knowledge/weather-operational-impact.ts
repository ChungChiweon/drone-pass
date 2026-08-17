import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherOperationalImpact = {
  impactId: string;
  weatherEntityId: string;
  aircraftContext: string;
  operationalEffect: string;
  riskLevel: string;
  decisionGuidance: string[];
  limitations: string[];
  sourceReferences: WeatherSourceLocator[];
  rawEvidenceText?: string;
  confidence?: number;
};
