import { describe, expect, it } from "vitest";
import type { WeatherSourceMetadata } from "../source-acquisition";
import { parseWeatherCode } from "../knowledge";
import { parseNormalizedWeatherDocument, runWeatherIngestion } from ".";

const source: WeatherSourceMetadata = {
  sourceId: "official-weather",
  canonicalTitle: "Official weather guide",
  issuingOrganization: "Official authority",
  authority: "OFFICIAL_AVIATION_WEATHER",
  sourceType: "OFFICIAL_GUIDANCE",
  currentnessStatus: "CURRENT",
  officialPageUrl: "https://amo.kma.go.kr/guide",
  fileType: "HTML",
  subjectCoverage: ["weather"],
  weatherTopics: ["fog", "low-visibility"],
  containsTables: false,
  containsDiagrams: false,
  containsWeatherSymbols: false,
  containsObservationExamples: false,
  extractionStatus: "READY_FOR_INGESTION",
  validationStatus: "OFFICIAL_DOMAIN_VERIFIED",
  notes: [],
};

describe("weather ingestion", () => {
  it("creates only source-evidenced knowledge with exact page locators", () => {
    const document = parseNormalizedWeatherDocument(source.sourceId, source.canonicalTitle, [
      { page: 3, text: "3.1 안개\n안개는 시정을 낮추는 기상현상이다. 항공기 운항에 영향을 줄 수 있다." },
    ]);
    const result = runWeatherIngestion({
      source,
      document,
      taxonomy: [
        { knowledgeId: "concept:fog", topic: "fog", name: "안개", aliases: ["안개"], kind: "concept" },
        { knowledgeId: "impact:fog", topic: "fog", name: "안개 운항 영향", aliases: ["안개"], kind: "operational-impact" },
      ],
      relationshipRules: [],
      visualInventory: [],
    });
    expect(result.concepts[0].sourceReferences[0]).toMatchObject({ sourceId: source.sourceId, page: 3 });
    expect(result.operationalImpacts).toHaveLength(1);
  });

  it("does not infer an operational impact without direct operational language", () => {
    const result = runWeatherIngestion({
      source,
      document: parseNormalizedWeatherDocument(source.sourceId, source.canonicalTitle, [
        { page: 1, text: "안개는 작은 물방울이 공기 중에 떠 있는 현상이다." },
      ]),
      taxonomy: [{ knowledgeId: "impact:fog", topic: "fog", name: "안개 영향", aliases: ["안개"], kind: "operational-impact" }],
      relationshipRules: [],
      visualInventory: [],
    });
    expect(result.operationalImpacts).toEqual([]);
  });

  it("keeps unsupported METAR tokens explicit", () => {
    const parsed = parseWeatherCode("METAR RKSI 010000Z 18005KT CAVOK", []);
    expect(parsed.station).toBe("RKSI");
    expect(parsed.unknownTokens).toContain("CAVOK");
  });

  it("requires one evidence sentence for a relationship", () => {
    const result = runWeatherIngestion({
      source,
      document: parseNormalizedWeatherDocument(source.sourceId, source.canonicalTitle, [
        { page: 2, text: "안개가 발생했다. 시정은 별도 관측 항목이다." },
      ]),
      taxonomy: [],
      relationshipRules: [{
        sourceKnowledgeId: "fog",
        targetKnowledgeId: "visibility",
        sourceAliases: ["안개"],
        targetAliases: ["시정"],
        relationType: "DECREASES",
      }],
      visualInventory: [],
    });
    expect(result.relationships).toEqual([]);
  });
});
