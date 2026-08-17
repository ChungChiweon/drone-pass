import {createHash} from "node:crypto";
import {transformWeatherKnowledge} from "./weather-to-exam-unit-transformer";
import type {CanonicalWeatherV3,WeatherKnowledgeType,WeatherShadowPack,WeatherShadowRelationship} from "./weather-shadow-types";
const TYPES:Array<[keyof CanonicalWeatherV3,WeatherKnowledgeType]>=[["concepts","Concept"],["phenomena","Phenomenon"],["hazards","Hazard"],["observations","Observation"],["weatherCodes","WeatherCode"],["operationalImpacts","OperationalImpact"]];
export function buildWeatherShadowPack(canonical:CanonicalWeatherV3):WeatherShadowPack{
 const knowledgeUnits=TYPES.flatMap(([key,type])=>(canonical[key] as CanonicalWeatherV3["concepts"]).map(x=>transformWeatherKnowledge(x,type)));
 const relationships:WeatherShadowRelationship[]=canonical.relationships.map(({knowledge:k})=>({relationId:String(k.relationId),fromId:String(k.fromId),toId:String(k.toId),relationType:String(k.relationType),sourceIds:Array.isArray(k.sourceIds)?k.sourceIds.map(String):[],evidence:String(k.evidence??"")}));
 const topicIndex:Record<string,string[]>={}; const counts=new Map<string,number>();
 for(const unit of knowledgeUnits){(topicIndex[unit.topic]??=[]).push(unit.knowledgeId);for(const r of unit.sourceReferences)counts.set(r.sourceId,(counts.get(r.sourceId)??0)+1)}
 const core={shadowPackId:"weather-shadow:canonical-v3",canonicalSetId:"canonical-weather-v3",canonicalChecksum:canonical.checksum,knowledgeUnits,relationships,sourceRegistry:[...counts].map(([sourceId,references])=>({sourceId,references})),topicIndex};
 return {...core,checksum:`sha256-${createHash("sha256").update(JSON.stringify(core)).digest("hex")}`};
}
