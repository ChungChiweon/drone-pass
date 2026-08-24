import {resolveWeatherTemplateEligibility} from "./weather-template-eligibility-resolver";
import type {WeatherCompatibilityStatus,WeatherExamUnit} from "./weather-shadow-types";
export function analyzeWeatherRuntimeCompatibility(unit:WeatherExamUnit):WeatherCompatibilityStatus{
 if(unit.knowledgeType==="Relationship") return "RELATIONSHIP_ONLY";
 if(!unit.sourceReferences.length) return "STRUCTURE_UNSUPPORTED";
 const templates=resolveWeatherTemplateEligibility(unit);
 if(!templates.length) return "TEMPLATE_MISSING";
 return unit.knowledgeType==="Concept"||unit.knowledgeType==="WeatherCode"?"DIRECTLY_COMPATIBLE":"COMPATIBLE_WITH_WEATHER_ADAPTER";
}
