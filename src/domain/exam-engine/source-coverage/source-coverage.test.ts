import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { KnowledgePack } from "@/domain/exam-engine/types";
import { DRONE_EXAM_TAXONOMY } from "./drone-exam-taxonomy";
import { auditDroneSourceCoverage } from "./source-coverage-audit";
import { calculateSourceCoverageMatrix } from "./source-coverage-matrix";
import { findDuplicateChecksums, DRONE_SOURCE_INVENTORY } from "./source-inventory";

function fixturePack(): KnowledgePack {
  const value = JSON.parse(readFileSync(join(process.cwd(), "work/exports/prod-active-export-20260731-26approved.json"), "utf8")) as { pack: { pack: KnowledgePack } };
  const pack = structuredClone(value.pack.pack);
  pack.atomicFacts = pack.atomicFacts.map((fact) => ["AF-063", "AF-064", "AF-065", "AF-066"].includes(fact.id) ? { ...fact, status: "approved" as const } : fact);
  return pack;
}

describe("drone source coverage", () => {
  it("inventories physical/logical sources and detects checksum duplicates", () => {
    expect(DRONE_SOURCE_INVENTORY).toHaveLength(2);
    expect(DRONE_SOURCE_INVENTORY.filter((item) => item.filePath)).toHaveLength(1);
    expect(findDuplicateChecksums(DRONE_SOURCE_INVENTORY)).toEqual([]);
  });

  it("maps current facts without treating volume as production readiness", () => {
    const pack = fixturePack();
    const before = JSON.stringify(pack);
    const matrix = calculateSourceCoverageMatrix({ inventory: DRONE_SOURCE_INVENTORY, facts: pack.atomicFacts, concepts: pack.concepts });
    expect(matrix).toHaveLength(DRONE_EXAM_TAXONOMY.length);
    expect(matrix.some((entry) => entry.candidateFactCount > 0)).toBe(true);
    expect(matrix.every((entry) => entry.coverageStatus !== "PRODUCTION_READY")).toBe(true);
    expect(JSON.stringify(pack)).toBe(before);
  });

  it("creates gaps, acquisition work, ingestion work, and source-based batches", () => {
    const audit = auditDroneSourceCoverage(fixturePack());
    expect(audit.gaps.some((gap) => gap.gapType === "MISSING_TOPIC")).toBe(true);
    expect(audit.manifest.some((item) => item.acquisitionStatus === "MISSING")).toBe(true);
    expect(audit.queue.some((item) => item.status === "REPROCESS_REQUIRED")).toBe(true);
    expect(audit.queue.some((item) => item.status === "BLOCKED_MISSING_FILE")).toBe(true);
    expect(audit.manifest.filter((item) => item.sourceId.startsWith("official-") && item.acquisitionStatus === "ALREADY_AVAILABLE")).toHaveLength(6);
    expect(audit.queue.filter((item) => item.sourceId.startsWith("official-") && item.status === "READY")).toHaveLength(18);
    expect(audit.queue.filter((item) => item.status === "BLOCKED_MISSING_ATTACHMENT")).toHaveLength(6);
    expect(audit.batches).toHaveLength(8);
    expect(JSON.stringify(audit.batches)).not.toContain("questionCount");
    expect(audit.mutationCount).toBe(0);
    expect(audit.queue.every((job) => job.outputPaths.every((outputPath) => outputPath.startsWith("work/source-inventory/")))).toBe(true);
  });
});
