import {describe,expect,it} from "vitest";
import {analyzeWeatherRuntimeCompatibility,resolveWeatherTemplateEligibility,transformWeatherKnowledge} from ".";
describe("weather shadow runtime",()=>{
 it("keeps weather type and source trace",()=>{const unit=transformWeatherKnowledge({knowledge:{conceptId:"c1",name:"Fog",definition:"Fog definition",sourceReferences:[{sourceId:"official",page:1}]},validation:{score:.9}},"Concept");expect(unit.knowledgeType).toBe("Concept");expect(unit.sourceReferences).toHaveLength(1);expect(resolveWeatherTemplateEligibility(unit)).toContain("CONCEPT_DEFINITION");expect(analyzeWeatherRuntimeCompatibility(unit)).toBe("DIRECTLY_COMPATIBLE")});
 it("does not invent hazard guidance",()=>{const unit=transformWeatherKnowledge({knowledge:{hazardId:"h1",name:"icing",definingConditions:["source condition"],sourceReferences:[{sourceId:"official"}]}},"Hazard");expect(unit.operationalContext).toBe("");expect(unit.supportedQuestionTypes).toEqual(["HAZARD_IDENTIFICATION","HAZARD_CONDITION"])});
 it("limits general aviation operational impacts",()=>{const unit=transformWeatherKnowledge({knowledge:{impactId:"i1",operationalEffect:"General aircraft impact",sourceReferences:[{sourceId:"official"}]}},"OperationalImpact");expect(unit.supportedQuestionTypes).toEqual(["OPERATIONAL_EFFECT"]);expect(unit.operationalContext).not.toMatch(/drone/i)});
});
