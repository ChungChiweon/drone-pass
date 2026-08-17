import { describe, expect, it } from "vitest";
import { buildCanonicalWeatherKnowledgeSet } from "../canonical";
import { runWeatherValidation } from "./weather-validation-runner";

describe("weather reconciliation validation", () => {
  const source = { sourceId: "official", page: 1 };
  it("uses dynamic inputs rather than a fixed 35-item list", () => {
    const inputs = Array.from({ length: 57 }, (_, index) => ({ kind: "concept" as const, knowledge: {
      conceptId: `weather-concept:${index}`, name: `C${index}`, definition: "A sufficiently complete sourced weather definition.",
      normalizedDefinition: "A sufficiently complete sourced weather definition.", keyProperties: [], variables: [], units: [], formulas: [], conditions: [], relatedConcepts: [], examples: [], misconceptions: [], topic: `${index}`, difficulty: "UNASSESSED" as const, confidence: 1, sourceReferences: [source],
    }}));
    expect(runWeatherValidation(inputs, { validSourceIds: new Set(["official"]), existingKnowledgeIds: new Set(inputs.map((x) => x.knowledge.conceptId)) })).toHaveLength(57);
  });

  it("blocks a code without structural rules and excludes it from canonical output", () => {
    const [result] = runWeatherValidation([{ kind: "weather-code", knowledge: {
      codeType: "METAR", token: "METAR", meaning: "routine report", valueType: "TOKEN",
      examples: [], sourceReferences: [source],
    }}], { validSourceIds: new Set(["official"]), existingKnowledgeIds: new Set() });
    expect(result.status).toBe("BLOCKED_STRUCTURE");
    expect(buildCanonicalWeatherKnowledgeSet([result]).items).toHaveLength(0);
  });

  it("keeps general aviation impact distinct from drone evidence", () => {
    const [result] = runWeatherValidation([{ kind: "operational-impact", knowledge: {
      impactId: "i", weatherEntityId: "icing", aircraftContext: "aircraft", operationalEffect: "항공기 운항에 영향을 준다.",
      riskLevel: "HIGH", decisionGuidance: [], limitations: [], sourceReferences: [source],
    }}], { validSourceIds: new Set(["official"]), existingKnowledgeIds: new Set() });
    expect(result.impactScope).toBe("VALIDATED_GENERAL_AVIATION_IMPACT");
    expect(result.warnings).toContain("GENERAL_AVIATION_ONLY");
  });
});
