import { HAZARD_REQUIRED_FIELDS, type WeatherHazardRecoveryRecord } from "./weather-hazard-schema";
import { requiredObservationFields, type WeatherObservationRecoveryRecord } from "./weather-observation-schema";

export type RecoveryValidationStatus = "VALIDATED" | "VALIDATED_WITH_WARNING" |
  "BLOCKED_SOURCE" | "BLOCKED_STRUCTURE" | "BLOCKED_VISUAL";

function missing(value: unknown): boolean { return value == null || value === "" || (Array.isArray(value) && value.length === 0); }

export function validateRecoveredHazard(record: WeatherHazardRecoveryRecord) {
  const blockers: string[] = HAZARD_REQUIRED_FIELDS.filter((field) => missing(record[field]));
  if (record.visualDependency === "REQUIRED") blockers.push("visualEvidence");
  const warnings = [!record.flightRisks?.length && "FLIGHT_RISK_NOT_GROUNDED", !record.avoidanceGuidance?.length && "AVOIDANCE_GUIDANCE_NOT_GROUNDED"].filter(Boolean) as string[];
  const status: RecoveryValidationStatus = blockers.includes("visualEvidence") ? "BLOCKED_VISUAL" : blockers.length ? "BLOCKED_STRUCTURE" : warnings.length ? "VALIDATED_WITH_WARNING" : "VALIDATED";
  return { knowledgeId: record.hazardId, status, blockers, warnings };
}

export function validateRecoveredObservation(record: WeatherObservationRecoveryRecord) {
  const blockers = requiredObservationFields(record.observationSchemaType).filter((field) => missing(record[field as keyof WeatherObservationRecoveryRecord]));
  if (record.visualDependency === "REQUIRED" && !record.interpretation.length) blockers.push("visualEvidence");
  const status: RecoveryValidationStatus = blockers.includes("visualEvidence") ? "BLOCKED_VISUAL" : blockers.length ? "BLOCKED_STRUCTURE" : "VALIDATED";
  return { knowledgeId: record.observationId, status, blockers, warnings: [] as string[] };
}
