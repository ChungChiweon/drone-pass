import type { KnowledgePack } from "@/domain/exam-engine/types";
import { calculateSourceCoverageMatrix } from "./source-coverage-matrix";
import { analyzeSourceGaps } from "./source-gap-analyzer";
import { buildSourceAcquisitionManifest } from "./source-acquisition-manifest";
import { buildSourceIngestionQueue } from "./source-ingestion-queue";
import { DRONE_SOURCE_INVENTORY } from "./source-inventory";
import { planSourceProcessingBatches } from "./source-processing-batches";
import { buildOfficialSourceAcquisitionItems, buildOfficialSourceIngestionJobs } from "./official-source-coverage-adapter";

export function auditDroneSourceCoverage(pack: KnowledgePack) {
  const matrix = calculateSourceCoverageMatrix({ inventory: DRONE_SOURCE_INVENTORY, facts: pack.atomicFacts, concepts: pack.concepts });
  const gaps = analyzeSourceGaps(matrix);
  const legacyManifest = buildSourceAcquisitionManifest(DRONE_SOURCE_INVENTORY);
  const manifest = [...legacyManifest, ...buildOfficialSourceAcquisitionItems()];
  const queue = [...buildSourceIngestionQueue(legacyManifest), ...buildOfficialSourceIngestionJobs()]
    .toSorted((a, b) => a.priority - b.priority || a.jobId.localeCompare(b.jobId));
  const batches = planSourceProcessingBatches(manifest);
  const subjectCoverage = Object.entries(matrix.reduce<Record<string, { topics: number; withSource: number; approvedFacts: number }>>((summary, entry) => { const value = summary[entry.subject] ?? { topics: 0, withSource: 0, approvedFacts: 0 }; value.topics += 1; value.withSource += entry.sourceCount > 0 ? 1 : 0; value.approvedFacts += entry.approvedFactCount; summary[entry.subject] = value; return summary; }, {}));
  return { inventory: DRONE_SOURCE_INVENTORY, matrix, gaps, manifest, queue, batches, subjectCoverage, mutationCount: 0 };
}
