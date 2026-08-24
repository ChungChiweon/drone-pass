import type { WeatherHazard } from "../knowledge";
import type { WeatherHazardRecoveryRecord, WeatherHazardSchemaType } from "./weather-hazard-schema";

const TYPE_BY_ID: Record<string, WeatherHazardSchemaType> = {
  thunderstorm: "CONVECTIVE", turbulence: "TURBULENCE", icing: "ICING",
  "strong-wind": "WIND", "heavy-rain": "PRECIPITATION", gust: "WIND", "wind-shear": "WIND",
};

export function recoverWeatherHazard(
  hazard: WeatherHazard,
  evidence: { definingConditions: string[]; characteristics: string[]; sourceReferences: WeatherHazardRecoveryRecord["sourceReferences"] },
): WeatherHazardRecoveryRecord {
  const topic = hazard.hazardId.split(":").at(-1) ?? hazard.name;
  return { hazardId: hazard.hazardId, hazardType: TYPE_BY_ID[topic] ?? "OTHER", name: hazard.name,
    definingConditions: evidence.definingConditions, characteristics: evidence.characteristics, topic,
    sourceReferences: evidence.sourceReferences, severityFactors: hazard.severityFactors,
    warningSigns: hazard.warningSigns, flightRisks: hazard.flightRisks,
    avoidanceGuidance: hazard.avoidanceGuidance, visualDependency: "NONE" };
}
