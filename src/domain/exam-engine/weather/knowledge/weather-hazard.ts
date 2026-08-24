import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherHazard = {
  hazardId: string;
  name: string;
  triggerConditions: string[];
  severityFactors: string[];
  warningSigns: string[];
  affectedOperations: string[];
  flightRisks: string[];
  avoidanceGuidance: string[];
  relatedPhenomenonIds: string[];
  rawEvidenceText?: string;
  sourceReferences: WeatherSourceLocator[];
  examRelevance: string;
};
