import type {
  WeatherCodeDefinition,
  WeatherConcept,
  WeatherHazard,
  WeatherObservation,
  WeatherOperationalImpact,
  WeatherPhenomenon,
  WeatherRelationship,
} from "../knowledge";

export type WeatherKnowledge = WeatherConcept | WeatherPhenomenon | WeatherHazard |
  WeatherObservation | WeatherCodeDefinition | WeatherOperationalImpact | WeatherRelationship;

export type WeatherKnowledgeKind = "concept" | "phenomenon" | "hazard" | "observation" |
  "weather-code" | "operational-impact" | "relationship";

export type ValidationEligibility = "ELIGIBLE" | "ELIGIBLE_WITH_WARNING" |
  "BLOCKED_SOURCE" | "BLOCKED_PROVENANCE" | "BLOCKED_RELATIONSHIP" |
  "BLOCKED_OPERATIONAL_INFERENCE" | "BLOCKED_STRUCTURE";

export type WeatherValidationStatus = "VALIDATED" | "VALIDATED_WITH_WARNING" |
  "REVIEW_REQUIRED" | "BLOCKED_SOURCE" | "BLOCKED_STRUCTURE" |
  "BLOCKED_RELATIONSHIP" | "ARCHIVE_ONLY";

export type WeatherValidationResult = {
  knowledgeId: string;
  kind: WeatherKnowledgeKind;
  eligibility: ValidationEligibility;
  status: WeatherValidationStatus;
  score: number;
  warnings: string[];
  blockers: string[];
  impactScope?: "VALIDATED_DRONE_IMPACT" | "VALIDATED_GENERAL_AVIATION_IMPACT" |
    "BLOCKED_UNSUPPORTED_INFERENCE";
};

export type WeatherValidationContext = {
  validSourceIds: ReadonlySet<string>;
  existingKnowledgeIds: ReadonlySet<string>;
};
