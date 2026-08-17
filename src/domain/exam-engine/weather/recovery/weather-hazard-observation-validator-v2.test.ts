import { describe, expect, it } from "vitest";
import { validateRecoveredHazard, validateRecoveredObservation } from "./weather-hazard-observation-validator-v2";

describe("hazard/observation schema validation", () => {
  it("does not require operational guidance for a source-grounded hazard", () => {
    const result = validateRecoveredHazard({ hazardId:"h",hazardType:"WIND",name:"gust",definingConditions:["official condition"],characteristics:["wind variation"],topic:"gust",sourceReferences:[{sourceId:"official",page:1}],visualDependency:"NONE" });
    expect(result.status).toBe("VALIDATED_WITH_WARNING");
    expect(result.blockers).toHaveLength(0);
  });
  it("uses observation-type-specific requirements", () => {
    const reported = validateRecoveredObservation({ observationId:"o",observationSchemaType:"REPORTED_ELEMENT",observationType:"wind",observedElements:["wind"],interpretation:["reported wind"],sourceReferences:[{sourceId:"official",page:1}],visualDependency:"NONE" });
    expect(reported.status).toBe("VALIDATED");
    const direct = validateRecoveredObservation({ observationId:"d",observationSchemaType:"DIRECT_MEASUREMENT",observationType:"wind",measuredVariables:["wind"],interpretation:[],sourceReferences:[{sourceId:"official",page:1}],visualDependency:"NONE" });
    expect(direct.status).toBe("BLOCKED_STRUCTURE");
  });
  it("requires visual validation only when visual evidence is required", () => {
    const result = validateRecoveredObservation({ observationId:"r",observationSchemaType:"REMOTE_SENSING",observationType:"radar",observedElements:["precipitation"],interpretation:[],instrument:"radar",sourceReferences:[{sourceId:"official",page:1}],visualDependency:"REQUIRED" });
    expect(result.status).toBe("BLOCKED_VISUAL");
  });
});
