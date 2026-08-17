import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherRelationshipType =
  | "CAUSES"
  | "RESULTS_IN"
  | "INCREASES_RISK_OF"
  | "DECREASES"
  | "INCREASES"
  | "ASSOCIATED_WITH"
  | "INDICATES"
  | "MEASURED_BY"
  | "OBSERVED_AS"
  | "AFFECTS_OPERATION"
  | "MITIGATED_BY"
  | "CONTRASTS_WITH"
  | "COMMONLY_CONFUSED_WITH"
  | "PRECEDES"
  | "PART_OF";

export type WeatherRelationship = {
  relationId: string;
  fromId: string;
  toId: string;
  relationType: WeatherRelationshipType;
  sourceIds: string[];
  evidence?: string;
  sourceLocator?: WeatherSourceLocator;
  confidence: number;
};
