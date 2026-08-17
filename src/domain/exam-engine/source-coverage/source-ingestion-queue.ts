import type { SourceAcquisitionItem } from "./source-acquisition-manifest";

export type IngestionJobStatus = "READY" | "BLOCKED_MISSING_FILE" | "BLOCKED_SOURCE_VERIFICATION" | "BLOCKED_MISSING_ATTACHMENT" | "BLOCKED_VERSION_AMBIGUITY" | "BLOCKED_DOWNLOAD_FAILURE" | "ALREADY_PROCESSED" | "REPROCESS_REQUIRED";
export type SourceIngestionJob = { jobId: string; sourceId: string; localPath: string | null; subject: string; adapter: string; priority: number; prerequisites: string[]; extractionTasks: string[]; validationTasks: string[]; outputPaths: string[]; status: IngestionJobStatus };

export function buildSourceIngestionQueue(manifest: SourceAcquisitionItem[]): SourceIngestionJob[] {
  return manifest.map((source) => {
    const isKnownPdf = source.sourceId === "ts-drone-aviation-safety-2021";
    const status: IngestionJobStatus = isKnownPdf ? "REPROCESS_REQUIRED" : !source.localPath ? "BLOCKED_MISSING_FILE" : source.verificationRequired ? "BLOCKED_SOURCE_VERIFICATION" : "READY";
    return { jobId: `ingest:${source.sourceId}`, sourceId: source.sourceId, localPath: source.localPath, subject: source.subject, adapter: source.extractionAdapter, priority: source.ingestionPriority, prerequisites: ["SOURCE_FILE_AVAILABLE", "SOURCE_VERSION_VERIFIED"], extractionTasks: source.extractionAdapter === "LEGAL_TABLE" ? ["TEXT_EXTRACTION", "LEGAL_STRUCTURE", "TABLE_EXTRACTION", "NUMERIC_PRESERVATION"] : ["TEXT_EXTRACTION", "STRUCTURE_RECONSTRUCTION"], validationTasks: ["CHECKSUM", "SOURCE_LOCATOR", "REVISION", "TRUNCATION", "DUPLICATE_EXTRACTION"], outputPaths: [`work/source-inventory/extracted/${source.sourceId}.json`], status };
  }).toSorted((a, b) => a.priority - b.priority || a.jobId.localeCompare(b.jobId));
}
