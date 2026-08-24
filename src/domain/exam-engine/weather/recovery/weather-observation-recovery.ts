import type { WeatherObservation } from "../knowledge";
import type { WeatherObservationRecoveryRecord, WeatherObservationSchemaType } from "./weather-observation-schema";

export function recoverWeatherObservation(
  observation: WeatherObservation,
  schemaType: WeatherObservationSchemaType,
  evidence: Partial<WeatherObservationRecoveryRecord>,
): WeatherObservationRecoveryRecord {
  return { observationId: observation.observationId, observationSchemaType: schemaType,
    observationType: observation.observationType, measuredVariables: evidence.measuredVariables ?? observation.measuredVariables,
    observedElements: evidence.observedElements, interpretation: evidence.interpretation ?? observation.interpretation ?? [],
    units: evidence.units ?? observation.units, instrument: evidence.instrument,
    relatedWeatherCodeIds: evidence.relatedWeatherCodeIds, sourceReferences: evidence.sourceReferences ?? observation.sourceReferences,
    visualDependency: evidence.visualDependency ?? "NONE" };
}
