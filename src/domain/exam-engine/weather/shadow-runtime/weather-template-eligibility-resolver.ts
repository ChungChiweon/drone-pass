import type {WeatherExamUnit,WeatherQuestionType} from "./weather-shadow-types";
const BY_TYPE:Record<WeatherExamUnit["knowledgeType"],WeatherQuestionType[]>={
 Concept:["CONCEPT_DEFINITION","COMPARISON"], Phenomenon:["PHENOMENON_IDENTIFICATION","CAUSE_EFFECT"],
 Hazard:["HAZARD_IDENTIFICATION","HAZARD_CONDITION"], Observation:["OBSERVATION_INTERPRETATION"],
 WeatherCode:["WEATHER_CODE_MEANING","WEATHER_CODE_STRUCTURE"], OperationalImpact:["OPERATIONAL_EFFECT"],
 Relationship:["RELATIONSHIP_SELECTION","CAUSE_EFFECT","COMPARISON"]
};
export function resolveWeatherTemplateEligibility(unit:WeatherExamUnit):WeatherQuestionType[]{
 const candidates=BY_TYPE[unit.knowledgeType];
 return candidates.filter(type=>{
  if(type==="CAUSE_EFFECT") return unit.causes.length>0||unit.effects.length>0;
  if(type==="HAZARD_CONDITION") return unit.conditions.length>0;
  if(type==="WEATHER_CODE_STRUCTURE") return unit.codeStructure.length>0;
  if(type==="OPERATIONAL_EFFECT") return Boolean(unit.operationalContext)&&!/drone|uas/i.test(unit.operationalContext);
  return Boolean(unit.statement||unit.definition);
 });
}
