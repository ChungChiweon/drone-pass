import type { WeatherCodeDefinition, WeatherOperationalImpact, WeatherRelationship } from "../knowledge";
import type { WeatherKnowledge, WeatherKnowledgeKind, WeatherValidationContext } from "./weather-validation-types";

export function weatherKnowledgeId(value: WeatherKnowledge): string {
  if ("conceptId" in value) return value.conceptId;
  if ("phenomenonId" in value) return value.phenomenonId;
  if ("hazardId" in value) return value.hazardId;
  if ("observationId" in value) return value.observationId;
  if ("impactId" in value) return value.impactId;
  if ("relationId" in value) return value.relationId;
  const code = value as WeatherCodeDefinition;
  return `weather-code:${code.codeType.toLowerCase()}:${code.token.toLowerCase()}`;
}

export function validateWeatherCodeStructure(code: WeatherCodeDefinition) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!code.token.trim() || !code.meaning.trim() || !code.valueType.trim()) blockers.push("CODE_CORE_MISSING");
  if (!code.positionRules?.length) blockers.push("CODE_POSITION_RULE_MISSING");
  if (!code.dependencies?.length) warnings.push("CODE_DEPENDENCY_MISSING");
  if (!code.examples?.length) warnings.push("CODE_EXAMPLE_MISSING");
  return { blockers, warnings };
}

export function validateOperationalImpactStructure(impact: WeatherOperationalImpact) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (!impact.weatherEntityId || !impact.operationalEffect.trim()) blockers.push("IMPACT_CORE_MISSING");
  const droneSpecific = /drone|unmanned|초경량|무인/i.test(`${impact.aircraftContext} ${impact.operationalEffect}`);
  const generalAviation = /aircraft|aviation|항공기|운항|이착륙/i.test(`${impact.aircraftContext} ${impact.operationalEffect}`);
  if (!droneSpecific && !generalAviation) blockers.push("UNSUPPORTED_OPERATIONAL_INFERENCE");
  if (!droneSpecific && generalAviation) warnings.push("GENERAL_AVIATION_ONLY");
  if (!impact.decisionGuidance.length) warnings.push("DECISION_GUIDANCE_MISSING");
  return {
    blockers,
    warnings,
    impactScope: droneSpecific ? "VALIDATED_DRONE_IMPACT" as const : generalAviation
      ? "VALIDATED_GENERAL_AVIATION_IMPACT" as const : "BLOCKED_UNSUPPORTED_INFERENCE" as const,
  };
}

export function validateRelationshipStructure(
  relation: WeatherRelationship,
  context: WeatherValidationContext,
) {
  const blockers: string[] = [];
  if (relation.fromId === relation.toId) blockers.push("SELF_RELATIONSHIP");
  const resolves = (id: string) => context.existingKnowledgeIds.has(id) ||
    [...context.existingKnowledgeIds].some((candidate) => candidate.endsWith(`:${id}`));
  if (!resolves(relation.fromId) || !resolves(relation.toId)) blockers.push("RELATION_ENDPOINT_MISSING");
  if (!(relation.evidence ?? "").trim()) blockers.push("RELATION_EVIDENCE_MISSING");
  const cues: Record<string, string[]> = {
    "warm-front": ["온난전선", "warm front"], "cold-front": ["한랭전선", "cold front"],
    precipitation: ["강수", "precipitation"], thunderstorm: ["뇌우", "thunderstorm"],
    fog: ["안개", "fog"], visibility: ["시정", "visibility"], humidity: ["습도", "humidity"],
    cloud: ["구름", "cloud"], satellite: ["위성", "satellite"], "weather-chart": ["일기도", "weather chart"],
  };
  const evidence = (relation.evidence ?? "").toLowerCase();
  if ([relation.fromId, relation.toId].some((id) => cues[id] && !cues[id].some((cue) => evidence.includes(cue)))) {
    blockers.push("RELATION_EVIDENCE_DOES_NOT_SUPPORT_BOTH_ENDPOINTS");
  }
  return { blockers, warnings: [] as string[] };
}

export function validateGenericStructure(value: WeatherKnowledge, kind: WeatherKnowledgeKind) {
  const blockers: string[] = [];
  const warnings: string[] = [];
  if (kind === "concept" && "definition" in value && value.definition.trim().length < 20) blockers.push("DEFINITION_TOO_SHORT");
  if (kind === "phenomenon" && "characteristics" in value && !value.characteristics.length) blockers.push("PHENOMENON_CHARACTERISTICS_MISSING");
  if (kind === "hazard" && "warningSigns" in value && !value.warningSigns.length) blockers.push("HAZARD_WARNING_SIGNS_MISSING");
  if (kind === "observation" && "observationMethod" in value && !value.observationMethod?.length) blockers.push("OBSERVATION_METHOD_MISSING");
  return { blockers, warnings };
}
