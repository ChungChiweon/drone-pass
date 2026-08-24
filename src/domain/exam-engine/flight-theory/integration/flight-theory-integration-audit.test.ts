import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const load = <T>(path: string) => JSON.parse(readFileSync(join(root, path), "utf8")) as T;
const audit = "work/flight-theory-integration-audit";

type Summary = {
  batchCount: number;
  canonicalTotal: number;
  reconciliation: string;
  uniqueIds: number;
  idCollisions: number;
  exactDuplicates: number;
  duplicateCandidates: number;
  hardContradictions: number;
  relationshipTotal: number;
  danglingRelations: number;
  unsafeGeneralizations: number;
  questionConstraintConflicts: number;
  provenanceErrors: number;
  taxonomy: { protectedGapCounts: Record<string, number>; protectedGapsPreserved: boolean };
  runtimeCompatibility: Record<string, number>;
  integrationReadiness: string;
  mutations: Record<string, number>;
};

describe("Flight Theory Integration Audit", () => {
  const summary = load<Summary>(`${audit}/summary.json`);

  it("discovers and reconciles all eight frozen batches", () => {
    expect(summary.batchCount).toBe(8);
    expect(summary.canonicalTotal).toBe(216);
    expect(summary.reconciliation).toBe("RECONCILED");
  });

  it("keeps all global Canonical IDs unique", () => {
    expect(summary.uniqueIds).toBe(216);
    expect(summary.idCollisions).toBe(0);
  });

  it("reports legacy relationship endpoint gaps without repairing them", () => {
    expect(summary.relationshipTotal).toBe(40);
    expect(summary.danglingRelations).toBe(15);
    const relationAudit = load<{ items: Array<{ status: string; reason?: string }> }>(`${audit}/relationship-endpoint-audit.json`);
    expect(relationAudit.items.filter((item) => item.status === "DANGLING")).toHaveLength(15);
    expect(relationAudit.items.filter((item) => item.status === "DANGLING").every((item) => item.reason === "EXPLICIT_ENDPOINT_FIELDS_MISSING")).toBe(true);
  });

  it("preserves same-entity different-role knowledge", () => {
    const clusters = load<Array<{ type: string; recommendedDisposition: string }>>(`${audit}/cross-batch-duplicate-clusters.json`);
    expect(summary.exactDuplicates).toBe(0);
    expect(summary.duplicateCandidates).toBe(1);
    expect(clusters[0]).toMatchObject({ type: "SAME_ENTITY_DIFFERENT_ROLE", recommendedDisposition: "KEEP_SEPARATE" });
  });

  it("does not infer unsafe cross-context knowledge", () => {
    expect(summary.unsafeGeneralizations).toBe(0);
    const safety = load<{ violations: unknown[] }>(`${audit}/generalization-safety-audit.json`);
    expect(safety.violations).toEqual([]);
  });

  it("keeps Li-ion, GPS, barometer, sensors, and RF boundaries intact", () => {
    const raw = readFileSync(join(root, audit, "generalization-safety-audit.json"), "utf8");
    for (const forbidden of ["LI_ION_TO_LIPO", "GPS_TO_RTH", "BAROMETER_TO_ALTITUDE_HOLD", "SENSOR_TO_IMU", "RF_TO_TELEMETRY", "INTERFERENCE_TO_LOST_LINK", "LOST_LINK_TO_FAILSAFE", "FAILSAFE_TO_RTH"])
      expect(raw.includes(`\"guard\": \"${forbidden}\"`)).toBe(false);
  });

  it("finds no question constraint conflict or hard contradiction", () => {
    expect(summary.questionConstraintConflicts).toBe(0);
    expect(summary.hardContradictions).toBe(0);
  });

  it("preserves 004C, 004D, and 004E protected gaps", () => {
    expect(summary.taxonomy.protectedGapCounts).toEqual({ "004C": 7, "004D": 14, "004E": 9 });
    expect(summary.taxonomy.protectedGapsPreserved).toBe(true);
  });

  it("classifies runtime compatibility without generating questions", () => {
    expect(summary.runtimeCompatibility).toEqual({ TEMPLATE_REQUIRED: 103, RELATION_ONLY: 40, SUPPORT_ONLY: 8, UNSUPPORTED: 14, ADAPTER_REQUIRED: 51 });
    expect(summary.integrationReadiness).toBe("NEEDS_CANONICAL_REVIEW");
  });

  it("keeps formula and procedure roles source-bound", () => {
    const formula = load<{ total: number; conflictingFormulaCount: number }>(`${audit}/formula-audit.json`);
    const procedures = load<{ roleConflicts: number }>(`${audit}/procedure-checklist-audit.json`);
    expect(formula.total).toBe(5);
    expect(formula.conflictingFormulaCount).toBe(0);
    expect(procedures.roleConflicts).toBe(0);
  });

  it("records zero mutation outside audit artifacts", () => {
    expect(Object.values(summary.mutations).every((value) => value === 0)).toBe(true);
  });
});
