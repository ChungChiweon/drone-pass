export type WeatherObservationSchemaType = "DIRECT_MEASUREMENT" | "REPORTED_ELEMENT" |
  "CODED_OBSERVATION" | "REMOTE_SENSING" | "VISUAL_OBSERVATION";

export type WeatherObservationRecoveryRecord = {
  observationId: string;
  observationSchemaType: WeatherObservationSchemaType;
  observationType: string;
  measuredVariables?: string[];
  observedElements?: string[];
  interpretation: string[];
  units?: string[];
  instrument?: string;
  relatedWeatherCodeIds?: string[];
  sourceReferences: Array<{ sourceId: string; page?: number | null; section?: string | null }>;
  visualDependency: "REQUIRED" | "SUPPORTIVE" | "NONE";
};

export function requiredObservationFields(type: WeatherObservationSchemaType): string[] {
  if (type === "DIRECT_MEASUREMENT") return ["measuredVariables", "units", "instrument", "sourceReferences"];
  if (type === "CODED_OBSERVATION") return ["observedElements", "interpretation", "relatedWeatherCodeIds", "sourceReferences"];
  if (type === "REMOTE_SENSING") return ["instrument", "observedElements", "interpretation", "sourceReferences"];
  return ["observedElements", "interpretation", "sourceReferences"];
}
