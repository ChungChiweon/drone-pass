export type WeatherHazardSchemaType = "CONVECTIVE" | "WIND" | "VISIBILITY" |
  "ICING" | "PRECIPITATION" | "TURBULENCE" | "OTHER";

export type WeatherHazardRecoveryRecord = {
  hazardId: string;
  hazardType: WeatherHazardSchemaType;
  name: string;
  definingConditions: string[];
  characteristics: string[];
  topic: string;
  sourceReferences: Array<{ sourceId: string; page?: number | null; section?: string | null }>;
  severityFactors?: string[];
  warningSigns?: string[];
  flightRisks?: string[];
  avoidanceGuidance?: string[];
  visualDependency: "REQUIRED" | "SUPPORTIVE" | "NONE";
};

export const HAZARD_REQUIRED_FIELDS = ["name", "definingConditions", "characteristics", "topic", "sourceReferences"] as const;
