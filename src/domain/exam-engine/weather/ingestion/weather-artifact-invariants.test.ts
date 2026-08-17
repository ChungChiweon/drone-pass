import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(join(process.cwd(), path), "utf8")) as T;
}

describe("SOURCE-BATCH-003 weather artifact invariants", () => {
  it("keeps all 47 topics and prepares validation without executing it", () => {
    const coverage = readJson<Array<{ topicId: string }>>("work/source-ingestion/source-batch-003/source-coverage-matrix.json");
    const manifest = readJson<{ validationExecuted: boolean; status: string }>("work/weather-validation/validation-input-manifest.json");
    expect(coverage).toHaveLength(47);
    expect(new Set(coverage.map((row) => row.topicId)).size).toBe(47);
    expect(manifest).toMatchObject({ validationExecuted: false, status: "PREPARED_NOT_EXECUTED" });
  });

  it("keeps every operational impact directly sourced and non-drone-generalized", () => {
    const impacts = readJson<Array<{ rawEvidenceText?: string; sourceReferences: unknown[]; limitations: string[] }>>("work/source-ingestion/source-batch-003/ingestion/operational-impacts.json");
    for (const impact of impacts) {
      expect(impact.rawEvidenceText).toMatch(/운항|비행|항공기|이착륙|접근|조종/);
      expect(impact.sourceReferences.length).toBeGreaterThan(0);
      expect(impact.limitations).toContain("Not generalized to drone-specific limits.");
    }
  });

  it("records zero Legal and Active mutations", () => {
    const summary = readJson<{ legalMutationCount: number; activePackMutationCount: number; activeGraphMutationCount: number }>("work/source-ingestion/source-batch-003/ingestion/summary.json");
    expect(summary).toMatchObject({ legalMutationCount: 0, activePackMutationCount: 0, activeGraphMutationCount: 0 });
  });
});
