import {analyzeWeatherRuntimeCompatibility} from "./weather-runtime-compatibility";
import {resolveWeatherTemplateEligibility} from "./weather-template-eligibility-resolver";
import type {CanonicalWeatherEntry,WeatherExamUnit,WeatherKnowledgeType,WeatherSourceReference} from "./weather-shadow-types";
const arr=(v:unknown)=>Array.isArray(v)?v.map(String):[];
const text=(...values:unknown[])=>values.find(v=>typeof v==="string"&&v.trim()) as string||"";
const refs=(v:unknown):WeatherSourceReference[]=>Array.isArray(v)?v.filter(x=>x&&typeof x==="object"&&typeof (x as {sourceId?:unknown}).sourceId==="string") as WeatherSourceReference[]:[];
const idFor=(k:Record<string,unknown>)=>text(k.conceptId,k.phenomenonId,k.hazardId,k.observationId,k.impactId,k.relationId, k.token);
export function transformWeatherKnowledge(entry:CanonicalWeatherEntry,knowledgeType:WeatherKnowledgeType):WeatherExamUnit{
 const k=entry.knowledge,id=idFor(k), sourceReferences=refs(k.sourceReferences);
 const statement=text(k.rawEvidenceText,k.normalizedDefinition,k.definition,k.meaning,k.operationalEffect,k.evidence,k.name,k.token);
 const unit:WeatherExamUnit={unitId:`weather-unit:${id}`,knowledgeId:id,knowledgeType,title:text(k.name,k.token,k.codeType,id),statement,definition:text(k.definition,k.meaning,statement),conditions:[...arr(k.conditions),...arr(k.requiredConditions),...arr(k.triggerConditions),...arr(k.definingConditions)],causes:arr(k.causes),effects:[...arr(k.effects),...arr(k.flightRisks)],observations:[...arr(k.observedElements),...arr(k.measuredVariables),...arr(k.interpretation)],codeStructure:arr(k.positionRules).map((x)=>typeof x==="string"?x:JSON.stringify(x)),operationalContext:text(k.operationalEffect),topic:text(k.topic,k.weatherEntityId,k.codeType,knowledgeType.toLowerCase()),sourceReferences:sourceReferences.length?sourceReferences:refs((k.sourceLocator&&typeof k.sourceLocator==="object")?[k.sourceLocator]:[]),relatedKnowledgeIds:[...arr(k.relatedConcepts),...arr(k.relatedPhenomenonIds),...arr(k.dependencies)],questionEligibility:knowledgeType!=="Relationship",supportedQuestionTypes:[],confidence:typeof k.confidence==="number"?k.confidence:typeof entry.validation?.score==="number"?entry.validation.score:0.7,compatibilityStatus:"NOT_QUESTION_ELIGIBLE"};
 unit.supportedQuestionTypes=resolveWeatherTemplateEligibility(unit); unit.compatibilityStatus=analyzeWeatherRuntimeCompatibility(unit); return unit;
}
