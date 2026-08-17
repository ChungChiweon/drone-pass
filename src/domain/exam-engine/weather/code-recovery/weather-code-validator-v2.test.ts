import { describe, expect, it } from "vitest";
import { validateWeatherCodeV2 } from "./weather-code-validator-v2";

const source = { sourceId: "official", page: 1 };
const code = { codeType: "RMK" as const, token: "RMK", meaning: "remarks", valueType: "REPORT_SECTION", examples: [], sourceReferences: [source] };

describe("weather code validator v2", () => {
  it("does not invent a dependency or accept source-free structure", () => {
    const result = validateWeatherCodeV2(code, [], [], [], []);
    expect(result.status).toBe("BLOCKED_EXAMPLE");
    expect(result.blockers).toContain("DEPENDENCY_EVIDENCE_MISSING");
  });
  it("accepts source-grounded RMK fields and rules with warnings for non-applicable units", () => {
    const fields = ["token", "meaning", "valueType", "position", "dependency", "example"] as const;
    const result = validateWeatherCodeV2(code, fields.map((fieldName) => ({ codeId: "weather-code:rmk:rmk", fieldName, sourceId: "official", sourceLocator: source, rawEvidenceText: "official", confidence: 1, supportStatus: "DIRECT" as const })),
      [{ codeId: "weather-code:rmk:rmk", afterToken: "altimeter", optional: true, repeatable: false, ruleStrength: "STRICT", sourceReference: source }],
      [{ codeId: "weather-code:rmk:rmk", dependencyType: "FOLLOWS", targetCodeId: "weather-code:metar:metar", condition: "remarks are present", required: false, sourceReference: source }],
      [{ targetCodeId: "weather-code:rmk:rmk", rawExample: "METAR ... RMK", parsedSegments: ["METAR", "RMK"], explanation: "official", sourceReference: source, validationStatus: "SOURCE_VERIFIED" }]);
    expect(result.status).toBe("VALIDATED_WITH_WARNING");
  });
});
