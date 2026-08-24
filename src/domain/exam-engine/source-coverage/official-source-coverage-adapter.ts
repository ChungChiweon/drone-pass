import { SOURCE_BATCH_001_METADATA } from "../source-acquisition/source-batch-001-data";
import type { SourceAcquisitionItem } from "./source-acquisition-manifest";
import type { SourceIngestionJob } from "./source-ingestion-queue";

export function buildOfficialSourceAcquisitionItems(): SourceAcquisitionItem[] {
  return SOURCE_BATCH_001_METADATA.map((source, index) => ({
    sourceId: source.sourceId,
    expectedTitle: source.canonicalTitle,
    organization: source.issuingOrganization,
    subject: "AVIATION_LAW",
    topics: topicIds(source.sourceType),
    authority: "OFFICIAL_LAW",
    requiredCurrentness: "CURRENT_EFFECTIVE",
    acquisitionStatus: "ALREADY_AVAILABLE",
    sourceUrl: source.officialPageUrl,
    localPath: source.localFiles[2],
    licenseOrUsageNote: "Official law source; follow the source portal usage policy.",
    ingestionPriority: index + 1,
    extractionAdapter: "LEGAL_TEXT",
    verificationRequired: false,
  }));
}

export function buildOfficialSourceIngestionJobs(): SourceIngestionJob[] {
  return SOURCE_BATCH_001_METADATA.flatMap((source, index) => [
    job(source.sourceId, source.localFiles[2], index, "text", "LEGAL_TEXT", "READY", ["TEXT_EXTRACTION", "LEGAL_STRUCTURE"]),
    job(source.sourceId, source.localFiles[2], index, "table", "LEGAL_TABLE", "READY", ["TABLE_EXTRACTION", "NUMERIC_PRESERVATION"]),
    job(source.sourceId, source.localFiles[2], index, "attachment", "LEGAL_ATTACHMENT", "BLOCKED_MISSING_ATTACHMENT", ["ATTACHMENT_INVENTORY"]),
    job(source.sourceId, source.localFiles[2], index, "version-comparison", "LEGAL_VERSION_COMPARISON", "READY", ["CURRENT_FUTURE_DIFF"]),
  ]);
}

function job(sourceId: string, localPath: string, index: number, suffix: string, adapter: string, status: SourceIngestionJob["status"], extractionTasks: string[]): SourceIngestionJob {
  return { jobId: `ingest:${sourceId}:${suffix}`, sourceId, localPath, subject: "AVIATION_LAW", adapter, priority: index + 1, prerequisites: ["SOURCE_FILE_AVAILABLE", "CURRENT_VERSION_VERIFIED"], extractionTasks, validationTasks: ["CHECKSUM", "SOURCE_LOCATOR", "REVISION", "TRUNCATION"], outputPaths: [`work/source-inventory/extracted/${sourceId}-${suffix}.json`], status };
}

function topicIds(type: (typeof SOURCE_BATCH_001_METADATA)[number]["sourceType"]) {
  if (type === "LAW") return ["law-system", "penalties", "administrative-disposition"];
  if (type === "ENFORCEMENT_DECREE") return ["device-definition", "legal-tables", "business-registration"];
  return ["pilot-certification", "device-report", "safety-certification", "flight-approval", "legal-forms"];
}
