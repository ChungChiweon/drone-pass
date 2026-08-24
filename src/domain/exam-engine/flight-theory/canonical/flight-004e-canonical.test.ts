import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

type Unit = {
  knowledgeId: string;
  knowledgeType: string;
  technicalContext: string;
  sourceCanonicalId?: string;
  targetCanonicalId?: string;
  warnings: string[];
  questionConstraints: { allowed: string[]; prohibited: string[] };
};
type CanonicalSet = {
  canonicalUnits: Unit[];
  relationshipUnits: Unit[];
  formulaUnits: Unit[];
  warningIds: string[];
  visualSupportIds: string[];
  gapAnalysis: { count: number; topics: string[] };
  technicalContextDistribution: Record<string, number>;
  checksum: string;
};
type Summary = {
  canonicalInput: number;
  canonicalGenerated: number;
  canonicalUnits: number;
  relationshipUnits: number;
  formulaUnits: number;
  candidateStatus: Record<string, number>;
  uasSpecificCount: number;
  visualCanonicalCount: number;
  regulatoryTableCanonicalCount: number;
  gapCount: number;
  existingCanonicalBaseline: number;
  totalFlightTheoryCanonical: number;
  checksumReproducible: boolean;
  unsupportedInferenceCount: number;
  mutations: Record<string, number>;
};

const root = process.cwd();
const load = <T>(path: string) => JSON.parse(readFileSync(join(root, path), "utf8")) as T;

describe("FLIGHT-THEORY-004E Canonical", () => {
  const set = load<CanonicalSet>("work/flight-theory-validation/004e/results/canonical-flight-knowledge-004e.json");
  const summary = load<Summary>("work/flight-theory-validation/004e/results/canonical-summary.json");
  const all = [...set.canonicalUnits, ...set.formulaUnits, ...set.relationshipUnits];

  it("uses only the 16 validated candidates", () => {
    expect(summary.canonicalInput).toBe(16);
    expect(summary.canonicalGenerated).toBe(16);
    expect(summary.candidateStatus).toEqual({ READY_WITH_WARNING: 6, READY: 10 });
    expect([summary.canonicalUnits, summary.formulaUnits, summary.relationshipUnits]).toEqual([11, 1, 4]);
  });

  it("creates deterministic unique IDs", () => {
    expect(new Set(all.map((item) => item.knowledgeId)).size).toBe(16);
    expect(all.every((item) => item.knowledgeId.startsWith("flight-004e:"))).toBe(true);
    expect(summary.checksumReproducible).toBe(true);
    expect(set.checksum.startsWith("sha256-")).toBe(true);
  });

  it("remaps every relationship endpoint without adding relationships", () => {
    const ids = new Set(all.map((item) => item.knowledgeId));
    expect(set.relationshipUnits).toHaveLength(4);
    expect(set.relationshipUnits.every((item) => item.sourceCanonicalId && item.targetCanonicalId && ids.has(item.sourceCanonicalId) && ids.has(item.targetCanonicalId))).toBe(true);
  });

  it("preserves warning and question constraints", () => {
    expect(set.warningIds).toHaveLength(6);
    expect(all.filter((item) => item.warnings.length > 0)).toHaveLength(6);
    expect(all.every((item) => item.questionConstraints.allowed.length > 0)).toBe(true);
  });

  it("does not promote UAS-specific or synthesize protected gaps", () => {
    const ids = all.map((item) => item.knowledgeId).join(" ").toLowerCase();
    expect(summary.uasSpecificCount).toBe(0);
    expect(all.every((item) => item.technicalContext !== "UAS_SPECIFIC")).toBe(true);
    for (const forbidden of ["controller", "control-link", "telemetry", "fpv", "lost-link", "failsafe", "return-to-home", "communication-range"])
      expect(ids.includes(forbidden)).toBe(false);
  });

  it("keeps one formula, visual support, and regulatory table in their boundaries", () => {
    expect(set.formulaUnits).toHaveLength(1);
    expect(set.visualSupportIds).toHaveLength(1);
    expect(summary.visualCanonicalCount).toBe(0);
    expect(summary.regulatoryTableCanonicalCount).toBe(0);
  });

  it("preserves all nine gaps and the prior 200 Canonical units", () => {
    expect(summary.gapCount).toBe(9);
    expect(set.gapAnalysis.topics).toHaveLength(9);
    expect(summary.existingCanonicalBaseline).toBe(200);
    expect(summary.totalFlightTheoryCanonical).toBe(216);
  });

  it("does not mutate external runtimes", () => {
    expect(summary.unsupportedInferenceCount).toBe(0);
    expect(Object.values(summary.mutations).every((value) => value === 0)).toBe(true);
  });

  it("keeps the detached index internally consistent", () => {
    const index = load<{ totalCanonicalCount: number; batches: Array<{ batchId: string; canonicalCount: number }>; activePack: boolean }>("work/flight-theory-validation/canonical-flight-theory-index.json");
    expect(index.totalCanonicalCount).toBe(216);
    expect(index.batches.find((batch) => batch.batchId === "004E")?.canonicalCount).toBe(16);
    expect(index.activePack).toBe(false);
    expect(createHash("sha256").update(readFileSync(join(root, "work/flight-theory-validation/004d/results/canonical-flight-knowledge-004d.json"))).digest("hex")).toHaveLength(64);
  });
});
