"use client";

import { useEffect, useState } from "react";
import { auditDroneSourceCoverage } from "@/domain/exam-engine/source-coverage";
import { createLocalKnowledgePackRepository } from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import { SOURCE_BATCH_001_FUTURE_VERSIONS, SOURCE_BATCH_001_METADATA } from "@/domain/exam-engine/source-acquisition/source-batch-001-data";
import type { AnnexIngestionSummary, AttachmentRecord, CanonicalTopicCoverage, FlightTheory004ASummary, FlightTheory004AValidationSummary, FlightTheory004BSummary, FlightTheory004BValidationSummary, FlightTheory004FSummary, FlightTheory004FValidationSummary, FlightTheory004GCanonicalSummary, FlightTheory004GSummary, FlightTheory004HSummary, FlightTheory004HValidationSummary, FlightTheoryCdeSummary, FlightTheorySourceSummary, IngestionSummary, LegalConsolidationSummary, LegalTopicCoverage, LegalValidationBatch, LegalValidationManifest, LegalValidationSummary, PrecisionIngestionSummary, RuntimeHardeningSummary, ShadowRuntimeSummary, TableReviewItem, TableValidationSummary, TopicGap, WeatherBatchSummary, WeatherHazardObservationRecoverySummary, WeatherIngestionBatch, WeatherIngestionSummary, WeatherReconciliationSummary, WeatherRecoverySummary, WeatherShadowRuntimeSummary, WeatherSourceSummary } from "./page";

import type { FlightTheory004CCanonicalSummary, FlightTheory004CSummary, FlightTheory004CValidationSummary, FlightTheory004DSummary, FlightTheory004DValidationSummary, FlightTheory004DCanonicalSummary, FlightTheory004ESummary } from "./page";

type Audit = ReturnType<typeof auditDroneSourceCoverage>;

export default function DroneSourceCoverageClient({ flightTheoryCde, flight004C, flight004CValidation, flight004CCanonical, flight004D, flight004DValidation, flight004DCanonical, flight004E, ingestionSummary, annexSummary, attachments, precisionSummary, tableSummary, tableMetrics, tableReviewQueue, validationManifest, validationBatches, validationSummary, topicCoverage, consolidationSummary, canonicalTopicCoverage, topicGaps, shadowSummary, hardeningSummary, weatherSummary, weatherBatches, weatherIngestion, weatherIngestionBatches, weatherReconciliation, weatherRecovery, weatherHazardObservationRecovery, weatherRuntime, flightTheorySource, flight004A, flight004AValidation, flight004B, flight004BValidation, flight004F, flight004FValidation, flight004G, flight004GCanonical, flight004H, flight004HValidation }: { flightTheoryCde:FlightTheoryCdeSummary|null; flight004C:FlightTheory004CSummary|null; flight004CValidation:FlightTheory004CValidationSummary|null; flight004CCanonical:FlightTheory004CCanonicalSummary|null; flight004D:FlightTheory004DSummary|null; flight004DValidation:FlightTheory004DValidationSummary|null; flight004DCanonical:FlightTheory004DCanonicalSummary|null; flight004E:FlightTheory004ESummary|null; ingestionSummary: IngestionSummary | null; annexSummary: AnnexIngestionSummary | null; attachments: AttachmentRecord[]; precisionSummary: PrecisionIngestionSummary | null; tableSummary: TableValidationSummary | null; tableMetrics: Record<string, number>; tableReviewQueue: TableReviewItem[]; validationManifest: LegalValidationManifest | null; validationBatches: LegalValidationBatch[]; validationSummary: LegalValidationSummary | null; topicCoverage: LegalTopicCoverage[]; consolidationSummary: LegalConsolidationSummary | null; canonicalTopicCoverage: CanonicalTopicCoverage[]; topicGaps: TopicGap[]; shadowSummary: ShadowRuntimeSummary | null;hardeningSummary:RuntimeHardeningSummary|null;weatherSummary:WeatherSourceSummary|null;weatherBatches:WeatherBatchSummary[];weatherIngestion:WeatherIngestionSummary|null;weatherIngestionBatches:WeatherIngestionBatch[];weatherReconciliation:WeatherReconciliationSummary|null;weatherRecovery:WeatherRecoverySummary|null;weatherHazardObservationRecovery:WeatherHazardObservationRecoverySummary|null;weatherRuntime:WeatherShadowRuntimeSummary|null;flightTheorySource:FlightTheorySourceSummary|null;flight004A:FlightTheory004ASummary|null;flight004AValidation:FlightTheory004AValidationSummary|null;flight004B:FlightTheory004BSummary|null;flight004BValidation:FlightTheory004BValidationSummary|null;flight004F:FlightTheory004FSummary|null;flight004FValidation:FlightTheory004FValidationSummary|null;flight004G:FlightTheory004GSummary|null;flight004GCanonical:FlightTheory004GCanonicalSummary|null;flight004H:FlightTheory004HSummary|null;flight004HValidation:FlightTheory004HValidationSummary|null }) {
  const [audit, setAudit] = useState<Audit | null>(null);
  const [packId, setPackId] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const stored = await createLocalKnowledgePackRepository().getActive();
        if (!stored) throw new Error("ACTIVE_PACK_MISSING");
        setPackId(stored.id);
        setAudit(auditDroneSourceCoverage(stored.pack));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void load();
  }, []);

  if (error) return <main style={layout}><h1>Drone Source Coverage</h1><p>{error}</p></main>;
  if (!audit) return <main style={layout}><h1>Drone Source Coverage</h1><p>Loading read-only inventory...</p></main>;

  const officialSources = audit.inventory.filter((item) => item.sourceAuthority.startsWith("OFFICIAL_")).length;
  const currentSources = audit.inventory.filter((item) => item.currentStatus === "CURRENT").length;
  const readyJobs = audit.queue.filter((item) => item.status === "READY").length;
  const blockedJobs = audit.queue.filter((item) => item.status.startsWith("BLOCKED_")).length;
  const downloadedFiles = SOURCE_BATCH_001_METADATA.reduce((sum, item) => sum + item.localFiles.length, 0);
  const verifiedAttachments = SOURCE_BATCH_001_METADATA.reduce((sum, item) => sum + item.attachments.filter((attachment) => attachment.checksum).length, 0);

  return <main style={layout}>
    <h1>Drone Exam Source Coverage</h1>
    <p><strong>ACTIVE Pack:</strong> {packId}</p>
    <div style={notice}><strong>Legal Runtime:</strong> FROZEN — READY_WITH_GAPS<br/><strong>Weather Runtime:</strong> FROZEN — READY_WITH_GAPS<br/><strong>Flight Theory:</strong> SOURCE ACQUISITION</div>
    <h2>비행이론·운용 Source Acquisition (004)</h2>
    {!flightTheorySource ? <p>SOURCE-BATCH-004 artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Official sources" value={flightTheorySource.sourcesDiscovered} /><Metric label="Downloaded sources" value={flightTheorySource.sourcesAcquired} />
        <Metric label="Topics connected" value={`${flightTheorySource.sourceConnectedTopics}/${flightTheorySource.totalTopics}`} /><Metric label="Ingestion-ready topics" value={flightTheorySource.readyTopics} />
        <Metric label="Visual assets" value={flightTheorySource.visualAssets} /><Metric label="Formulas" value={flightTheorySource.formulas} />
        <Metric label="Procedures" value={flightTheorySource.procedures} /><Metric label="READY jobs" value={flightTheorySource.readyJobs} />
        <Metric label="Manual acquisition" value={flightTheorySource.manualAcquisition} /><Metric label="Mutation" value={flightTheorySource.mutationCount} />
      </section>
      <table style={table}><thead><tr><th>Batch</th><th>Topics</th><th>Ready</th><th>Sources</th><th>Assets</th><th>Status</th></tr></thead><tbody>{flightTheorySource.batchCoverage.map(batch=><tr key={batch.batchId}><td>{batch.batchId}</td><td>{batch.topicCount}</td><td>{batch.sourceCoveredTopics}</td><td>{batch.officialSourceCount}</td><td>{batch.visualAssetCount}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <p><strong>Major gaps:</strong> {Object.entries(flightTheorySource.majorGaps).map(([gap,count])=>`${gap} ${count}`).join(" / ")}</p>
      <div style={warning}>Source-connected means an official reference exists; ingestion-ready additionally requires a validated local source file. Domestic TS textbook acquisition remains manual.</div>
    </>}
    <h3>004C/D/E Gap Acquisition (read-only)</h3>
    {!flightTheoryCde ? <p>004C/D/E acquisition artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources acquired" value={`${flightTheoryCde.sourcesAcquired}/${flightTheoryCde.sourcesDiscovered}`} /><Metric label="Domestic official" value={flightTheoryCde.domesticOfficialSources} />
        <Metric label="Overseas official" value={flightTheoryCde.overseasOfficialSources} /><Metric label="Visual assets" value={flightTheoryCde.visualAssets} />
        <Metric label="Formula candidates" value={flightTheoryCde.formulas} /><Metric label="Table candidates" value={flightTheoryCde.tables} />
        <Metric label="Manual acquisition" value={flightTheoryCde.manualAcquisition} /><Metric label="Canonical baseline" value={flightTheoryCde.canonicalBaseline.total} />
      </section>
      <table style={table}><thead><tr><th>Batch</th><th>Topics</th><th>Source covered</th><th>Local ready</th><th>Domestic</th><th>UAS specific</th><th>Status</th></tr></thead><tbody>{Object.values(flightTheoryCde.topicCoverage).map(batch=><tr key={batch.batchId}><td>{batch.batchId}</td><td>{batch.totalTopics}</td><td>{batch.sourceCovered}</td><td>{batch.localReady}</td><td>{batch.domesticReady}</td><td>{batch.uasSpecificReady}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <p><strong>Major gaps:</strong> {Object.entries(flightTheoryCde.gapCounts).map(([gap,count])=>`${gap} ${count}`).join(" / ")}</p>
      <div style={warning}>General official technical sources are supporting evidence only. Manufacturer RTH, failsafe, battery thresholds, and claimed radio range are blocked. Mutation count: {Object.values(flightTheoryCde.mutations).reduce((sum,count)=>sum+count,0)}.</div>
    </>}
    <h3>SOURCE-BATCH-004C Limited Ingestion (read-only)</h3>
    {!flight004C ? <p>004C limited-ingestion artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="TS manual recovery" value={flight004C.tsRecoveryStatus} />
        <Metric label="Sources used" value={flight004C.sourcesUsed.length} />
        <Metric label="Pages / sections" value={`${flight004C.pagesProcessed} / ${flight004C.sectionsProcessed}`} />
        <Metric label="Topics" value={flight004C.topicsProcessed} />
        <Metric label="Concepts" value={flight004C.conceptsGenerated} />
        <Metric label="Battery knowledge" value={flight004C.batteryKnowledgeGenerated} />
        <Metric label="Formulas / relations" value={`${flight004C.formulasGenerated} / ${flight004C.relationshipsGenerated}`} />
        <Metric label="Visuals / tables" value={`${flight004C.visualLinksGenerated} / ${flight004C.tableCandidates}`} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004C.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004C.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Validation input:</strong> {Object.entries(flight004C.validationEligibility).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Remaining gaps:</strong> {flight004C.remainingGaps.join(", ")}</p>
      <div style={warning}>Ingestion candidates only. Canonical baseline remains {flight004C.canonicalBaseline}; mutation count {flight004C.mutationCount}. 004D: {flight004C.batch004DStatus}; 004E: {flight004C.batch004EStatus}. Unsupported inference: {flight004C.unsupportedInferenceCount}.</div>
    </>}
    <h3>FLIGHT-THEORY-004C Validation (read-only)</h3>
    {!flight004CValidation ? <p>004C validation results are not available.</p> : <>
      <section style={cards}>
        <Metric label="Knowledge input" value={flight004CValidation.knowledgeValidationInputCount} />
        <Metric label="Visual input" value={flight004CValidation.visualValidationInputCount} />
        <Metric label="Table input" value={flight004CValidation.tableValidationInputCount} />
        <Metric label="VALIDATED" value={flight004CValidation.knowledgeStatus.VALIDATED??0} />
        <Metric label="Warnings" value={flight004CValidation.knowledgeStatus.VALIDATED_WITH_WARNING??0} />
        <Metric label="Blocked knowledge" value={flight004CValidation.knowledgeStatus.BLOCKED??0} />
        <Metric label="Formula validated" value={flight004CValidation.formulaResults.FORMULA_VALIDATED??0} />
        <Metric label="Canonical candidates" value={flight004CValidation.canonicalCandidateCount} />
      </section>
      <p><strong>Visual support:</strong> {Object.entries(flight004CValidation.visualResults).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Table review:</strong> {Object.entries(flight004CValidation.tableResults).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004CValidation.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Gap {flight004CValidation.gapCount}:</strong> {flight004CValidation.gaps.join(", ")}</p>
      <div style={notice}>Runtime preview: {flight004CValidation.runtimeReadiness}. TS: {flight004CValidation.tsRecoveryStatus}. Canonical generated during validation: {String(flight004CValidation.canonicalGenerated)}. Total mutation: {Object.values(flight004CValidation.mutations).reduce((sum,count)=>sum+count,0)}.</div>
    </>}
    <h3>FLIGHT-THEORY-004C Canonical (read-only)</h3>
    {!flight004CCanonical ? <p>004C Canonical artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Canonical input" value={flight004CCanonical.canonicalInput} />
        <Metric label="Canonical generated" value={flight004CCanonical.canonicalGenerated} />
        <Metric label="READY / warning" value={`${flight004CCanonical.candidateStatus.READY??0} / ${flight004CCanonical.candidateStatus.READY_WITH_WARNING??0}`} />
        <Metric label="Formula / relations" value={`${flight004CCanonical.formulaCount} / ${flight004CCanonical.relationshipCount}`} />
        <Metric label="Visual support" value={`${flight004CCanonical.visualSupportCount} (Canonical ${flight004CCanonical.visualCanonicalCount})`} />
        <Metric label="Unresolved tables" value={flight004CCanonical.unresolvedTableCount} />
        <Metric label="Flight Theory total" value={flight004CCanonical.totalFlightTheoryCanonical} />
        <Metric label="Freeze" value={flight004CCanonical.freezeStatus} />
      </section>
      <p><strong>Types:</strong> {Object.entries(flight004CCanonical.typeDistribution).map(([type,count])=>`${type} ${count}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004CCanonical.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Gap {flight004CCanonical.gapCount}:</strong> {flight004CCanonical.gaps.join(", ")}</p>
      <div style={notice}>Runtime: {flight004CCanonical.runtimeReadiness}. TS: {flight004CCanonical.tsRecoveryStatus}. Next: {flight004CCanonical.nextBatch}. Checksum reproducible: {String(flight004CCanonical.checksumReproducible)}. Mutation: {Object.values(flight004CCanonical.mutations).reduce((sum,count)=>sum+count,0)}.</div>
    </>}
    <h3>SOURCE-BATCH-004D Limited Ingestion (read-only)</h3>
    {!flight004D ? <p>004D limited-ingestion artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004D.sourcesUsed.length} />
        <Metric label="Pages / sections" value={`${flight004D.pagesProcessed} / ${flight004D.sectionsProcessed}`} />
        <Metric label="Topics" value={flight004D.topicsProcessed} />
        <Metric label="Control concepts" value={flight004D.controlConceptsGenerated} />
        <Metric label="Sensor components / principles" value={`${flight004D.sensorComponentsGenerated} / ${flight004D.sensorPrinciplesGenerated}`} />
        <Metric label="Navigation / failures" value={`${flight004D.navigationKnowledgeGenerated} / ${flight004D.failureKnowledgeGenerated}`} />
        <Metric label="Relationships" value={flight004D.relationshipsGenerated} />
        <Metric label="Visual / table / formula" value={`${flight004D.visualLinksGenerated} / ${flight004D.tableCandidates} / ${flight004D.formulasGenerated}`} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004D.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004D.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Validation input:</strong> {flight004D.validationInputCount} ({Object.entries(flight004D.validationEligibility).map(([status,count])=>`${status} ${count}`).join(" / ")})</p>
      <p><strong>Remaining gaps:</strong> {flight004D.remainingGaps.join(", ")}</p>
      <div style={warning}>TS: {flight004D.tsRecoveryStatus}. 004E: {flight004D.batch004EStatus}. Canonical baseline: {flight004D.canonicalBaseline}. Unsupported inference: {flight004D.unsupportedInferenceCount}. Mutation: {flight004D.mutationCount}.</div>
    </>}
    <h3>FLIGHT-THEORY-004D Validation (read-only)</h3>
    {!flight004DValidation ? <p>004D validation artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Primary Knowledge" value={flight004DValidation.primaryKnowledgeCount} />
        <Metric label="Visual / Table" value={`${flight004DValidation.visualCount} / ${flight004DValidation.tableCount}`} />
        <Metric label="Validated" value={flight004DValidation.statusCounts.VALIDATED ?? 0} />
        <Metric label="Warning" value={flight004DValidation.statusCounts.VALIDATED_WITH_WARNING ?? 0} />
        <Metric label="Blocked" value={Object.entries(flight004DValidation.statusCounts).filter(([key])=>key.startsWith("BLOCKED")).reduce((sum,[,count])=>sum+count,0)} />
        <Metric label="Canonical candidates" value={flight004DValidation.canonicalCandidateCount} />
        <Metric label="UAS specific" value={flight004DValidation.uasSpecificCount} />
        <Metric label="Protected gaps" value={flight004DValidation.gapCount} />
      </section>
      <p><strong>Types:</strong> {Object.entries(flight004DValidation.typeResults).map(([type,statuses])=>`${type} ${Object.values(statuses).reduce((sum,count)=>sum+count,0)}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004DValidation.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Supporting:</strong> Visual {flight004DValidation.visualStatus} / Table {flight004DValidation.tableStatus}</p>
      <p><strong>Topic validation:</strong> {Object.entries(flight004DValidation.topicStatusCounts).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <div style={notice}>Runtime preview: {flight004DValidation.runtimeReadiness}. TS: {flight004DValidation.tsStatus}. Next 004E: {flight004DValidation.batch004EStatus}. Canonical generated: {String(flight004DValidation.canonicalGenerated)}. Mutation: {Object.values(flight004DValidation.mutations).reduce((sum,count)=>sum+count,0)}.</div>
    </>}
    <h3>FLIGHT-THEORY-004D Canonical (read-only)</h3>
    {!flight004DCanonical ? <p>004D Canonical artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Canonical input / generated" value={`${flight004DCanonical.canonicalInput} / ${flight004DCanonical.canonicalGenerated}`} />
        <Metric label="Knowledge / Relations" value={`${flight004DCanonical.canonicalUnits} / ${flight004DCanonical.relationshipUnits}`} />
        <Metric label="READY / Warning" value={`${flight004DCanonical.candidateStatus.READY ?? 0} / ${flight004DCanonical.candidateStatus.READY_WITH_WARNING ?? 0}`} />
        <Metric label="UAS specific" value={flight004DCanonical.uasSpecificCount} />
        <Metric label="Visual / unresolved table" value={`${flight004DCanonical.visualSupportCount} / ${flight004DCanonical.unresolvedTableCount}`} />
        <Metric label="Protected gaps" value={flight004DCanonical.gapCount} />
        <Metric label="Flight Theory total" value={flight004DCanonical.totalFlightTheoryCanonical} />
      </section>
      <p><strong>Types:</strong> {Object.entries(flight004DCanonical.typeDistribution).map(([type,count])=>`${type} ${count}`).join(" / ")}</p>
      <p><strong>Context:</strong> {Object.entries(flight004DCanonical.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Runtime / Freeze:</strong> {flight004DCanonical.runtimeReadiness} / {flight004DCanonical.freezeStatus}</p>
      <p><strong>Checksum:</strong> {flight004DCanonical.checksum} ({flight004DCanonical.checksumReproducible ? "reproducible" : "mismatch"})</p>
      <div style={notice}>TS: {flight004DCanonical.tsStatus}. Next batch: {flight004DCanonical.nextBatch}. Visual/Table/Formula Canonical: {flight004DCanonical.visualCanonicalCount}/{flight004DCanonical.tableCanonicalCount}/{flight004DCanonical.formulaCount}. Mutation: {Object.values(flight004DCanonical.mutations).reduce((sum,count)=>sum+count,0)}.</div>
    </>}
    <h3>SOURCE-BATCH-004E Limited Ingestion (read-only)</h3>
    {!flight004E ? <p>004E limited-ingestion artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004E.sourcesUsed.length} />
        <Metric label="Pages / sections" value={`${flight004E.pagesProcessed} / ${flight004E.sectionsProcessed}`} />
        <Metric label="Topics" value={flight004E.topicsProcessed} />
        <Metric label="RF concepts" value={flight004E.rfConceptsGenerated} />
        <Metric label="Components / links" value={`${flight004E.communicationComponentsGenerated} / ${flight004E.communicationLinksGenerated}`} />
        <Metric label="Interference / failure" value={`${flight004E.interferenceKnowledgeGenerated} / ${flight004E.failureKnowledgeGenerated}`} />
        <Metric label="Relationships" value={flight004E.relationshipsGenerated} />
        <Metric label="Visual / table / formula" value={`${flight004E.visualLinksGenerated} / ${flight004E.tableCandidates} / ${flight004E.formulasGenerated}`} />
        <Metric label="UAS specific" value={flight004E.uasSpecificCount} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004E.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Technical context:</strong> {Object.entries(flight004E.technicalContext).map(([context,count])=>`${context} ${count}`).join(" / ")}</p>
      <p><strong>Validation input:</strong> {flight004E.validationInputCount} ({Object.entries(flight004E.validationEligibility).map(([status,count])=>`${status} ${count}`).join(" / ")})</p>
      <p><strong>Remaining gaps:</strong> {flight004E.remainingGaps.join(", ")}</p>
      <div style={warning}>Regulatory lineage: {flight004E.regulatoryLineageCount}. TS: {flight004E.tsStatus}. Canonical baseline: {flight004E.canonicalBaseline}. Canonical generated: {String(flight004E.canonicalGenerated)}. Unsupported inference: {flight004E.unsupportedInferenceCount}. Mutation: {flight004E.mutationCount}.</div>
    </>}
    <h3>004A 비행원리·공기역학 Ingestion</h3>
    {!flight004A ? <p>004A ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Source sections" value={flight004A.sectionsProcessed} /><Metric label="Pages" value={flight004A.pagesProcessed} />
        <Metric label="Concepts" value={flight004A.conceptsGenerated} /><Metric label="Principles" value={flight004A.principlesGenerated} />
        <Metric label="Formulas" value={flight004A.formulasGenerated} /><Metric label="Relationships" value={flight004A.relationshipsGenerated} />
        <Metric label="Visual links" value={flight004A.visualLinksGenerated} /><Metric label="Topics processed" value={flight004A.topicsProcessed} />
        <Metric label="Validation ready" value={(flight004A.validationEligibility.ELIGIBLE??0)+(flight004A.validationEligibility.ELIGIBLE_WITH_WARNING??0)} /><Metric label="Blocked" value={flight004A.blockedItems+(flight004A.validationEligibility.BLOCKED_FORMULA??0)} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004A.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <div style={notice}>004A remains an ingestion candidate set, not validated or approved knowledge. Formula candidates require page review.</div>
    </>}
    <h3>004A Validation &amp; Canonical</h3>
    {!flight004AValidation ? <p>004A validation artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation input" value={Object.values(flight004AValidation.input).reduce((a,b)=>a+b,0)} /><Metric label="VALIDATED" value={flight004AValidation.status.VALIDATED??0} />
        <Metric label="Warnings" value={flight004AValidation.status.VALIDATED_WITH_WARNING??0} /><Metric label="Blocked" value={Object.entries(flight004AValidation.status).filter(([key])=>key.startsWith("BLOCKED")).reduce((sum,[,count])=>sum+count,0)} />
        <Metric label="Formula accepted" value={flight004AValidation.canonical.formulas} /><Metric label="Canonical 004A" value={flight004AValidation.canonical.total} />
        <Metric label="Validated topics" value={(flight004AValidation.topicCoverage.VALIDATED??0)+(flight004AValidation.topicCoverage.VALIDATED_WITH_GAPS??0)} /><Metric label="Runtime readiness" value={flight004AValidation.readiness} />
      </section>
      <p><strong>Canonical distribution:</strong> Concept {flight004AValidation.canonical.concepts} / Principle {flight004AValidation.canonical.principles} / Formula {flight004AValidation.canonical.formulas} / Relationship {flight004AValidation.canonical.relationships}</p>
      <div style={notice}>Canonical 004A is a detached validation artifact. It is not written to the Active Pack or production graph.</div>
    </>}
    <h3>Flight Theory - 004B Aircraft Structure Ingestion</h3>
    {!flight004B ? <p>004B ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004B.sourcesProcessed} /><Metric label="Source sections" value={flight004B.sectionsProcessed} />
        <Metric label="Topic coverage" value={`${flight004B.topicsProcessed}/23`} /><Metric label="Components" value={flight004B.componentsGenerated} />
        <Metric label="Systems" value={flight004B.systemsGenerated} /><Metric label="Concepts" value={flight004B.conceptsGenerated} />
        <Metric label="Relationships" value={flight004B.relationshipsGenerated} /><Metric label="Visual links" value={flight004B.visualLinksGenerated} />
        <Metric label="Unsupported inference" value={flight004B.unsupportedInferenceCount} /><Metric label="Validation ready" value={flight004B.validationReadyCount} />
      </section>
      <p><strong>Coverage:</strong> {Object.entries(flight004B.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Quality:</strong> {Object.entries(flight004B.quality).map(([metric,value])=>`${metric} ${value}`).join(" / ")}</p>
      <div style={notice}>Read-only ingestion artifact. 004B validation and canonical construction have not run; unsupported multicopter-specific topics remain explicit gaps.</div>
    </>}
    <h3>004B Validation &amp; Canonical</h3>
    {!flight004BValidation ? <p>004B validation artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation input" value={Object.values(flight004BValidation.input).reduce((sum,count)=>sum+count,0)} />
        <Metric label="Components accepted" value={flight004BValidation.canonical.components} /><Metric label="Systems accepted" value={flight004BValidation.canonical.systems} />
        <Metric label="Concepts accepted" value={flight004BValidation.canonical.concepts} /><Metric label="Relationships accepted" value={flight004BValidation.canonical.relationships} />
        <Metric label="Warnings" value={flight004BValidation.status.VALIDATED_WITH_WARNING??0} /><Metric label="Blocked" value={Object.entries(flight004BValidation.status).filter(([key])=>key.startsWith("BLOCKED")).reduce((sum,[,count])=>sum+count,0)} />
        <Metric label="Canonical 004B" value={flight004BValidation.canonical.total} /><Metric label="Runtime readiness" value={flight004BValidation.readiness} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004BValidation.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Multicopter gaps:</strong> {flight004BValidation.multicopterGap.map(item=>item.topicId.replace("flight:","")).join(" / ")}</p>
      <div style={notice}>Detached, read-only Canonical 004B artifact. No Active Pack, graph, or question runtime mutation.</div>
    </>}
    <h3>Flight Theory - 004F Flight Operation Ingestion</h3>
    {!flight004F ? <p>004F ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004F.sourcesProcessed} /><Metric label="Sections" value={flight004F.sectionsProcessed} />
        <Metric label="Procedures" value={flight004F.proceduresGenerated} /><Metric label="Ordered procedures" value={flight004F.orderedProcedures} />
        <Metric label="Checklists" value={flight004F.checklistItemsGenerated} /><Metric label="Concepts" value={flight004F.conceptsGenerated} />
        <Metric label="Safety knowledge" value={flight004F.safetyKnowledgeGenerated} /><Metric label="Decisions" value={flight004F.operationalDecisionsGenerated} />
        <Metric label="Relationships" value={flight004F.relationshipsGenerated} /><Metric label="Visual links" value={flight004F.visualLinksGenerated} />
        <Metric label="Unsupported inference" value={flight004F.unsupportedInferenceCount} /><Metric label="Validation ready" value={flight004F.validationReadyCount} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004F.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Procedure inventory:</strong> {Object.entries(flight004F.procedureInventoryClassification).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Deferred:</strong> {Object.entries(flight004F.deferredKnowledge).map(([batch,count])=>`${batch} ${count}`).join(" / ")}</p>
      <div style={notice}>Read-only 004F ingestion artifact. Checklist ordering is preserved only when explicit; 004G/004H evidence is deferred, not ingested.</div>
    </>}
    <h3>Flight Theory - 004F Validation</h3>
    {!flight004FValidation ? <p>004F validation artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation input" value={flight004FValidation.inputCount} />
        <Metric label="Validated" value={flight004FValidation.statusCounts.VALIDATED ?? 0} />
        <Metric label="Warnings" value={flight004FValidation.statusCounts.VALIDATED_WITH_WARNING ?? 0} />
        <Metric label="Blocked" value={Object.entries(flight004FValidation.statusCounts).filter(([key])=>key.startsWith("BLOCKED")).reduce((sum,[,count])=>sum+count,0)} />
        <Metric label="Canonical" value={flight004FValidation.canonicalCount} />
        <Metric label="Duplicate losers" value={flight004FValidation.duplicateLoserCount} />
      </section>
      <p><strong>Decision / Monitoring:</strong> {flight004FValidation.canonicalTypeCounts.OPERATIONAL_DECISION ?? 0} / {flight004FValidation.canonicalTypeCounts.OPERATIONAL_MONITORING ?? 0}</p>
      <p><strong>Topic validation:</strong> {Object.entries(flight004FValidation.topicStatusCounts).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Runtime readiness:</strong> {flight004FValidation.runtimeReadiness}</p>
      <p><strong>Deferred:</strong> {Object.entries(flight004FValidation.deferredCounts).map(([batch,count])=>`${batch} ${count}`).join(" / ")}</p>
      <div style={notice}>Read-only Canonical 004F artifact. Active Pack, graph, and question runtime remain unchanged.</div>
    </>}
    <h3>Flight Theory - 004G Emergency / Failure / Safety Ingestion</h3>
    {!flight004G ? <p>004G ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004G.sourcesProcessed} /><Metric label="Topics" value={flight004G.topicsProcessed} />
        <Metric label="Failure modes" value={flight004G.failureModesGenerated} /><Metric label="Symptoms" value={flight004G.failureSymptomsGenerated} />
        <Metric label="Emergency procedures" value={flight004G.emergencyProceduresGenerated} /><Metric label="Ordered / Unordered" value={`${flight004G.orderedProcedures} / ${flight004G.unorderedProcedures}`} />
        <Metric label="Decisions" value={flight004G.emergencyDecisionsGenerated} /><Metric label="Safety knowledge" value={flight004G.safetyKnowledgeGenerated} />
        <Metric label="Relationships" value={flight004G.relationshipsGenerated} /><Metric label="Visual links" value={flight004G.visualLinksGenerated} />
        <Metric label="004F deferred recovered" value={flight004G.deferred004FRecovered} /><Metric label="Validation ready" value={flight004G.validationReadyCount} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004G.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Validation:</strong> {Object.entries(flight004G.validationEligibility).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Deferred 004H:</strong> {flight004G.deferred004H}</p>
      <p><strong>Unsupported inference:</strong> {flight004G.unsupportedInferenceCount}</p>
      <div style={notice}>Read-only 004G ingestion artifact. Manufacturer-specific RTH, failsafe, battery thresholds, and fire suppression responses were not inferred.</div>
    </>}
    <h3>Flight Theory - Canonical 004G (read-only)</h3>
    {!flight004GCanonical ? <p>004G Canonical artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Canonical candidates" value={flight004GCanonical.inputCandidates} />
        <Metric label="Canonical generated" value={flight004GCanonical.canonicalCount} />
        <Metric label="Warning canonical" value={flight004GCanonical.warningCanonical} />
        <Metric label="Blocked relationships" value={5} />
        <Metric label="Duplicate exclusions" value={1} />
        <Metric label="NO_KNOWLEDGE" value={flight004GCanonical.noKnowledgeTopics} />
      </section>
      <p><strong>Type distribution:</strong> {Object.entries(flight004GCanonical.typeDistribution).map(([type,count])=>`${type} ${count}`).join(" / ")}</p>
      <p><strong>Runtime readiness:</strong> {flight004GCanonical.runtimeReadiness}</p>
      <p><strong>Freeze:</strong> {flight004GCanonical.freezeStatus}</p>
      <p><strong>Next:</strong> 004H ({flight004GCanonical.deferred004H} deferred items preserved)</p>
      <div style={notice}>Canonical 004G is frozen with gaps. This display does not modify the Active Pack, graph, or question runtime.</div>
    </>}
    <h3>Flight Theory - 004H Human Factors / Risk / Maintenance Ingestion</h3>
    {!flight004H ? <p>004H ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources" value={flight004H.sourcesProcessed} /><Metric label="Topics" value={flight004H.topicsProcessed} />
        <Metric label="Human factors" value={flight004H.humanFactorsGenerated} /><Metric label="Risk management" value={flight004H.riskManagementGenerated} />
        <Metric label="CRM / Coordination" value={flight004H.crewCoordinationGenerated} /><Metric label="Maintenance" value={flight004H.maintenanceGenerated} />
        <Metric label="Inspection" value={flight004H.inspectionGenerated} /><Metric label="Relationships" value={flight004H.relationshipsGenerated} />
        <Metric label="Deferred recovered" value={flight004H.deferred004FRecovered} /><Metric label="Validation ready" value={flight004H.validationReadyCount} />
      </section>
      <p><strong>Topic coverage:</strong> {Object.entries(flight004H.topicCoverage).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Procedure inventory:</strong> {Object.entries(flight004H.procedureInventoryFinalClassification).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>004G inventory candidates:</strong> {flight004H.inventory004HCandidates} / <strong>Visual links:</strong> {flight004H.visualLinksGenerated}</p>
      <p><strong>Unsupported inference:</strong> {flight004H.unsupportedInferenceCount}</p>
      <div style={notice}>Read-only 004H ingestion artifact. Validation and Canonical generation have not run; existing Canonical sets remain frozen.</div>
    </>}
    <h3>Flight Theory - Canonical 004H Validation (read-only)</h3>
    {!flight004HValidation ? <p>004H validation artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation input" value={flight004HValidation.inputCount} />
        <Metric label="Validated" value={flight004HValidation.statusCounts.VALIDATED ?? 0} />
        <Metric label="Warning" value={flight004HValidation.warningCount} />
        <Metric label="Blocked" value={flight004HValidation.blockedCount} />
        <Metric label="Canonical" value={flight004HValidation.canonicalCount} />
        <Metric label="Flight Theory total" value={flight004HValidation.totalFlightTheoryCanonical} />
      </section>
      <p><strong>Canonical types:</strong> {Object.entries(flight004HValidation.canonicalTypeCounts).map(([type,count])=>`${type} ${count}`).join(" / ")}</p>
      <p><strong>Topic validation:</strong> {Object.entries(flight004HValidation.topicStatusCounts).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Runtime readiness:</strong> {flight004HValidation.runtimeReadiness} / <strong>Freeze:</strong> {flight004HValidation.freezeStatus}</p>
      <p><strong>Source gaps:</strong> {flight004HValidation.sourceGapBatches.join(" / ")}</p>
      <div style={notice}>004A/B/F/G/H are frozen. Next work is official-source acquisition for 004C/004D/004E, not question generation.</div>
    </>}
    <h2>Weather workspace reconciliation (read-only)</h2>
    {!weatherReconciliation ? <p>Reconciliation artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Baseline" value={weatherReconciliation.baseline} /><Metric label="Current knowledge" value={weatherReconciliation.knowledge} />
        <Metric label="Added knowledge" value={weatherReconciliation.added} /><Metric label="New sources" value={weatherReconciliation.newSources} />
        <Metric label="Provenance verified" value={(weatherReconciliation.provenance.PROVENANCE_VERIFIED ?? 0) + (weatherReconciliation.provenance.PROVENANCE_VERIFIED_WITH_WARNING ?? 0)} />
        <Metric label="Blocked additions" value={(weatherReconciliation.provenance.PROVENANCE_MISSING ?? 0) + (weatherReconciliation.provenance.SOURCE_BLOCKED ?? 0)} />
        <Metric label="WeatherCode verified" value={(weatherReconciliation.weatherCodes.VALIDATED ?? 0) + (weatherReconciliation.weatherCodes.VALIDATED_WITH_WARNING ?? 0)} />
        <Metric label="WeatherCode blocked" value={weatherReconciliation.weatherCodes.BLOCKED_STRUCTURE ?? 0} />
        <Metric label="General aviation impact" value={weatherReconciliation.operationalImpacts.VALIDATED_GENERAL_AVIATION_IMPACT ?? 0} />
        <Metric label="Drone impact" value={weatherReconciliation.operationalImpacts.VALIDATED_DRONE_IMPACT ?? 0} />
        <Metric label="Validation accepted" value={(weatherReconciliation.validation.VALIDATED ?? 0) + (weatherReconciliation.validation.VALIDATED_WITH_WARNING ?? 0)} />
      </section>
      <div style={notice}>Current 57-item workspace is preserved. Reconciliation is read-only and performs no approval or runtime mutation.</div>
    </>}
    <h2>WeatherCode recovery and drone operation sources</h2>
    {!weatherRecovery ? <p>003E/003F recovery artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="003E status" value={weatherRecovery.batch003E} /><Metric label="Code baseline" value={weatherRecovery.weatherCodeBaseline} />
        <Metric label="Code warnings" value={weatherRecovery.weatherCodeValidation.VALIDATED_WITH_WARNING ?? 0} />
        <Metric label="Observation guideline" value={weatherRecovery.observationGuideline} /><Metric label="003F status" value={weatherRecovery.batch003F} />
        <Metric label="Official sources acquired" value={weatherRecovery.officialSourcesAcquired} /><Metric label="Drone/UAS sources" value={weatherRecovery.directDroneSources} />
        <Metric label="Drone impacts" value={weatherRecovery.droneSpecificImpacts} /><Metric label="General aviation impacts" value={weatherRecovery.operationalImpactValidation.VALIDATED_GENERAL_AVIATION ?? 0} />
        <Metric label="Blocked impacts" value={weatherRecovery.operationalImpactValidation.BLOCKED_UNSUPPORTED ?? 0} /><Metric label="Canonical v2" value={weatherRecovery.canonicalV2Total} />
        <Metric label="Shadow runtime" value={weatherRecovery.shadowRuntimeReadiness} />
      </section>
      <p><strong>Canonical v2 distribution:</strong> {Object.entries(weatherRecovery.canonicalV2Counts).map(([kind,count])=>`${kind} ${count}`).join(" / ")}</p>
      <div style={warning}>Official drone/UAS context is not an operating-limit Fact. Direct threshold or go/no-go evidence is still required for drone-specific OperationalImpact.</div>
    </>}
    <h2>Weather hazard and observation recovery (003G)</h2>
    {!weatherHazardObservationRecovery ? <p>003G recovery artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Hazards recovered" value={`${weatherHazardObservationRecovery.hazardRecovered}/${weatherHazardObservationRecovery.hazardBaseline}`} />
        <Metric label="Hazard warnings" value={weatherHazardObservationRecovery.hazardValidation.VALIDATED_WITH_WARNING ?? 0} />
        <Metric label="Observations recovered" value={`${weatherHazardObservationRecovery.observationRecovered}/${weatherHazardObservationRecovery.observationBaseline}`} />
        <Metric label="Observation validated" value={(weatherHazardObservationRecovery.observationValidation.VALIDATED ?? 0) + (weatherHazardObservationRecovery.observationValidation.VALIDATED_WITH_WARNING ?? 0)} />
        <Metric label="Observation blocked" value={weatherHazardObservationRecovery.observationValidation.BLOCKED_STRUCTURE ?? 0} />
        <Metric label="Code/observation relations" value={weatherHazardObservationRecovery.newRelations} />
        <Metric label="Canonical v3" value={weatherHazardObservationRecovery.canonicalV3Total} />
        <Metric label="Hazard coverage" value={weatherHazardObservationRecovery.coverage.hazardCoverage} />
        <Metric label="Observation coverage" value={weatherHazardObservationRecovery.coverage.observationCoverage} />
        <Metric label="Shadow readiness" value={weatherHazardObservationRecovery.shadowRuntimeReadiness} />
      </section>
      <p><strong>Canonical v3 distribution:</strong> {Object.entries(weatherHazardObservationRecovery.canonicalV3Counts).map(([kind,count])=>`${kind} ${count}`).join(" / ")}</p>
      <p><strong>Checksum:</strong> <code>{weatherHazardObservationRecovery.canonicalV3Checksum}</code></p>
      <div style={notice}>The seven hazards retain source-bounded warnings. Five forecast, warning, or curriculum records remain blocked as observations; no source meaning was inferred and no runtime data was mutated.</div>
    </>}
    <h2>Weather Shadow Runtime (read-only)</h2>
    {!weatherRuntime ? <p>Weather Shadow Runtime artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Runtime status" value={weatherRuntime.status} /><Metric label="Canonical input" value={weatherRuntime.canonicalInput} />
        <Metric label="Question eligible" value={weatherRuntime.questionEligible} /><Metric label="Compiler compatible" value={weatherRuntime.compilerCompatible} />
        <Metric label="Generated" value={weatherRuntime.classic.generated} /><Metric label="Skipped" value={weatherRuntime.classic.skipped} />
        <Metric label="Graph usage" value={weatherRuntime.graph.graphUsageScore} /><Metric label="Graph-backed" value={weatherRuntime.graph.graphBackedQuestions} />
        <Metric label="Runtime-ready topics" value={(weatherRuntime.topicRuntime.RUNTIME_READY ?? 0)+(weatherRuntime.topicRuntime.RUNTIME_READY_WITH_GAPS ?? 0)} />
        <Metric label="Template gaps" value={weatherRuntime.templateGaps} />
      </section>
      <p><strong>Question types:</strong> {Object.entries(weatherRuntime.questionTypes).map(([type,count])=>`${type} ${count}`).join(" / ")}</p>
      <p><strong>Knowledge yield:</strong> {Object.entries(weatherRuntime.knowledgeTypeYield).map(([type,yieldResult])=>`${type} ${yieldResult.generated}/${yieldResult.canonical}`).join(" / ")}</p>
      <div style={notice}>This runtime uses only the immutable Canonical Weather v3 artifact. It does not save questions or modify the Active Pack, graph, or repositories.</div>
    </>}
    <h2>Weather source acquisition (read-only)</h2>
    {!weatherSummary ? <p>Weather SOURCE-BATCH-003 artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Weather sources found" value={weatherSummary.discoveredSources} />
        <Metric label="Downloaded" value={weatherSummary.acquiredSources} />
        <Metric label="Current sources" value={weatherSummary.currentSources} />
        <Metric label="Topics covered" value={`${weatherSummary.coveredTopics}/${weatherSummary.weatherTopicCount}`} />
        <Metric label="Visual inventory" value={weatherSummary.visualAssets} />
        <Metric label="READY weather jobs" value={weatherSummary.readyIngestionJobs} />
        <Metric label="Manual acquisition" value={weatherSummary.manualAcquisitionRequired} />
        <Metric label="Legal mutation" value={weatherSummary.legalMutationCount} />
      </section>
      <p><strong>Visual types:</strong> {weatherSummary.visualAssetTypes.join(", ")}</p>
      <table style={table}><thead><tr><th>Batch</th><th>Scope</th><th>Source covered</th><th>Ingested</th><th>Status</th></tr></thead><tbody>{weatherBatches.map((batch)=><tr key={batch.batchId}><td>{batch.batchId}</td><td>{batch.name}</td><td>{batch.sourceCoveredTopics}/{batch.totalTopics}</td><td>{batch.ingestedTopics}/{batch.totalTopics}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <div style={notice}>Legal Runtime remains frozen. Weather artifacts use a separate namespace and this screen performs no approval or storage mutation.</div>
    </>}
    <h3>Weather ingestion and gaps</h3>
    {!weatherIngestion ? <p>Weather ingestion artifacts are not available.</p> : <>
      <section style={cards}>
        <Metric label="Sources completed" value={`${weatherIngestion.completedSources}/${weatherIngestion.attemptedReadySources}`} />
        <Metric label="Pages / sections" value={`${weatherIngestion.pagesProcessed}/${weatherIngestion.sectionsProcessed}`} />
        <Metric label="Concepts" value={weatherIngestion.concepts} /><Metric label="Phenomena" value={weatherIngestion.phenomena} />
        <Metric label="Hazards" value={weatherIngestion.hazards} /><Metric label="Observations" value={weatherIngestion.observations} />
        <Metric label="Weather codes" value={weatherIngestion.weatherCodes} /><Metric label="Operational impacts" value={weatherIngestion.operationalImpacts} />
        <Metric label="Relationships" value={weatherIngestion.relationships} /><Metric label="Visual links" value={weatherIngestion.visualLinks} />
        <Metric label="Validation-ready" value={weatherIngestion.validationReadyKnowledge} /><Metric label="Manual acquisition" value={weatherIngestion.manualAcquisitionRequired} />
      </section>
      <p><strong>003D new official sources:</strong> {weatherIngestion.new003DSources} / <strong>003F:</strong> {weatherIngestion.new003FSources} ({weatherIngestion.droneSpecificSourceStatus})</p>
      <table style={table}><thead><tr><th>Batch</th><th>Source covered</th><th>Ingested</th><th>Gaps</th><th>Status</th></tr></thead><tbody>{weatherIngestionBatches.map(batch=><tr key={batch.batchId}><td>{batch.batchId} {batch.name}</td><td>{batch.sourceCoveredTopics}/{batch.totalTopics}</td><td>{batch.ingestedTopics}</td><td>{batch.gapTopics}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <div style={warning}>003F drone-specific operating limits remain unavailable. METAR/RMK and IWXXM attachments were acquired from verified publisher links; unsupported code tokens remain explicit.</div>
    </>}
    <div style={warning}>현재 433개 Fact는 전체 시험범위를 대표하지 않습니다. 문제 40개 목표는 운영 목표에서 제외되었으며, Source Coverage를 우선합니다.</div>
    <section style={cards}>
      <Metric label="Logical sources" value={audit.inventory.length} />
      <Metric label="Official sources" value={officialSources} />
      <Metric label="Current sources" value={currentSources} />
      <Metric label="Source gaps" value={audit.gaps.length} />
      <Metric label="READY jobs" value={readyJobs} />
      <Metric label="BLOCKED jobs" value={blockedJobs} />
      <Metric label="Current official sources" value={SOURCE_BATCH_001_METADATA.length} />
      <Metric label="Future effective sources" value={SOURCE_BATCH_001_FUTURE_VERSIONS.length} />
      <Metric label="Downloaded files" value={downloadedFiles} />
      <Metric label="Verified attachments" value={verifiedAttachments} />
      <Metric label="Failed downloads" value={0} />
      <Metric label="READY_FOR_EXTRACTION sources" value={SOURCE_BATCH_001_METADATA.filter((item) => item.extractionStatus === "READY_FOR_EXTRACTION").length} />
      <Metric label="Official READY jobs" value={SOURCE_BATCH_001_METADATA.length * 3} />
      <Metric label="Blocked attachment jobs" value={SOURCE_BATCH_001_METADATA.length} />
    </section>
    <h2>Official law source versions</h2>
    <p style={notice}>Current effective sources are eligible for extraction only. Future-effective versions are tracked separately and are not question evidence.</p>
    <table style={table}><thead><tr><th>Source</th><th>Version</th><th>Effective</th><th>Pages</th><th>Official / local</th><th>Checksum</th></tr></thead><tbody>{SOURCE_BATCH_001_METADATA.map((source) => <tr key={source.sourceId}><td>{source.canonicalTitle}</td><td>{source.versionStatus}<br />{source.promulgationNumber}</td><td>{source.effectiveDate}</td><td>{source.pageCount}</td><td><a href={source.officialPageUrl} target="_blank" rel="noreferrer">Official page</a><br /><code>{source.localFiles[2]}</code></td><td><code>{source.checksum.slice(0, 22)}...</code></td></tr>)}</tbody></table>
    <h3>Future-effective timeline</h3>
    <ul>{SOURCE_BATCH_001_FUTURE_VERSIONS.map((version) => <li key={`${version.sourceId}:${version.lawId}`}>{version.sourceId}: {version.effectiveDate} ({version.versionStatus}) — excluded from current evidence</li>)}</ul>
    <h2>Source ingestion progress</h2>
    {!ingestionSummary ? <p>Ingestion artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Executed jobs" value={ingestionSummary.readyJobsExecuted} />
        <Metric label="Articles extracted" value={ingestionSummary.articlesExtracted} />
        <Metric label="Paragraphs extracted" value={ingestionSummary.paragraphsExtracted} />
        <Metric label="Tables detected" value={ingestionSummary.tablesDetected} />
        <Metric label="Tables extracted" value={ingestionSummary.tablesExtracted} />
        <Metric label="Fact candidates" value={ingestionSummary.factCandidatesGenerated} />
        <Metric label="Relation candidates" value={ingestionSummary.relationCandidatesGenerated} />
        <Metric label="Conflicts" value={ingestionSummary.conflictsDetected} />
      </section>
      <p><strong>Job status:</strong> {Object.entries(ingestionSummary.jobStatus).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Revision differences:</strong> {Object.entries(ingestionSummary.revisionComparison).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Topic coverage:</strong> source-level extraction only; maximum state EXTRACTED, never VALIDATED or PRODUCTION_READY.</p>
      <table style={table}><thead><tr><th>Source</th><th>Quality</th><th>HTML/PDF</th><th>Table extraction</th><th>Unresolved refs</th></tr></thead><tbody>{ingestionSummary.sourceQuality.map((source)=><tr key={source.sourceId}><td>{source.sourceId}</td><td>{source.extractionQualityScore.toFixed(4)}</td><td>{source.htmlPdfAgreementRate.toFixed(4)}</td><td>{source.tableExtractionRate.toFixed(4)}</td><td>{source.unresolvedReferenceRate.toFixed(4)}</td></tr>)}</tbody></table>
      <div style={warning}>Separate attachment jobs remain blocked. The official HTML snapshots contain no article body and the acquired PDFs reference appendices/forms without embedding their separate table files. No candidate is eligible for automatic promotion.</div>
    </>}
    <h2>Legal candidate validation preparation</h2>
    {!validationManifest ? <p>Validation input manifest is not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation candidates" value={validationManifest.totalCandidateCount} />
        <Metric label="Eligible" value={validationManifest.eligibility.ELIGIBLE ?? 0} />
        <Metric label="Eligible with warnings" value={validationManifest.eligibility.ELIGIBLE_WITH_WARNINGS ?? 0} />
        <Metric label="Blocked" value={validationManifest.totalCandidateCount - (validationManifest.eligibility.ELIGIBLE ?? 0) - (validationManifest.eligibility.ELIGIBLE_WITH_WARNINGS ?? 0)} />
        <Metric label="HIGH ready" value={validationManifest.highRelevanceReadyCount} />
        <Metric label="MEDIUM ready" value={validationManifest.mediumRelevanceReadyCount} />
      </section>
      <table style={table}><thead><tr><th>Batch</th><th>Topic</th><th>Total</th><th>Eligible</th><th>Warnings</th><th>Blocked</th><th>HIGH/MEDIUM</th><th>Status</th></tr></thead><tbody>{validationBatches.map((batch) => <tr key={batch.batchId}><td>{batch.batchId}</td><td>{batch.topic}</td><td>{batch.candidateCount}</td><td>{batch.eligibleCount}</td><td>{batch.eligibleWithWarningsCount}</td><td>{batch.blockedCount}</td><td>{batch.highRelevanceCount}/{batch.mediumRelevanceCount}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <div style={warning}>Input eligibility only. No candidate has been legally validated or promoted. Table Layer: {validationManifest.tableLayerStatus}.</div>
    </>}
    <h2>Legal validation results</h2>
    {!validationSummary ? <p>Validation results are not available.</p> : <>
      <section style={cards}>
        <Metric label="Validation completed" value={validationSummary.executedCandidateCount} />
        <Metric label="VALIDATED" value={validationSummary.validationStatus.VALIDATED ?? 0} />
        <Metric label="VALIDATED_WITH_WARNING" value={validationSummary.validationStatus.VALIDATED_WITH_WARNING ?? 0} />
        <Metric label="REVIEW_REQUIRED" value={validationSummary.validationStatus.REVIEW_REQUIRED ?? 0} />
        <Metric label="BLOCKED" value={validationSummary.preBlockedCandidateCount + Object.entries(validationSummary.validationStatus).filter(([status]) => status.startsWith("BLOCKED")).reduce((sum, [, count]) => sum + count, 0)} />
        <Metric label="NOT_EXAM_RELEVANT" value={validationSummary.validationStatus.NOT_EXAM_RELEVANT ?? 0} />
        <Metric label="Knowledge set candidates" value={validationSummary.legalKnowledgeSetCandidateCount} />
        <Metric label="Canonical duplicate groups" value={validationSummary.canonicalDuplicateGroupCount} />
        <Metric label="Major conflicts" value={validationSummary.conflictResultCount} />
      </section>
      <table style={table}><thead><tr><th>Batch</th><th>Topic</th><th>Input</th><th>Validated</th><th>Warnings</th><th>Blocked</th><th>Not exam</th><th>Status</th></tr></thead><tbody>{validationSummary.batchSummaries.map((batch) => <tr key={batch.batchId}><td>{batch.batchId}</td><td>{batch.topic}</td><td>{batch.inputCandidateCount}</td><td>{batch.validationStatus.VALIDATED ?? 0}</td><td>{batch.validationStatus.VALIDATED_WITH_WARNING ?? 0}</td><td>{Object.entries(batch.validationStatus).filter(([status]) => status.startsWith("BLOCKED")).reduce((sum, [, count]) => sum + count, 0)}</td><td>{batch.validationStatus.NOT_EXAM_RELEVANT ?? 0}</td><td>{batch.status}</td></tr>)}</tbody></table>
      <h3>Topic validation coverage</h3>
      <table style={table}><thead><tr><th>Topic</th><th>Validated</th><th>HIGH / MEDIUM</th><th>Blocked</th><th>Conflicts</th><th>Duplicates</th><th>Sources</th><th>Confidence</th><th>Status</th></tr></thead><tbody>{topicCoverage.map((topic) => <tr key={topic.topicId}><td>{topic.topicLabel}<br/><code>{topic.topicId}</code></td><td>{topic.validatedCandidateCount}</td><td>{topic.validatedHighCount} / {topic.validatedMediumCount}</td><td>{topic.blockedCount}</td><td>{topic.conflictCount}</td><td>{topic.duplicateCount}</td><td>{topic.currentOfficialSourceCount}</td><td>{topic.coverageConfidence.toFixed(2)}</td><td>{topic.status}</td></tr>)}</tbody></table>
      <div style={warning}>Read-only result. The legal candidate set is not a KnowledgePack and no Fact, Graph, or Question data was changed. Table Layer: {validationSummary.tableLayerStatus}; mutation count: {validationSummary.mutationCount}.</div>
    </>}
    <h2>Canonical legal knowledge consolidation</h2>
    {!consolidationSummary ? <p>Consolidation result is not available.</p> : <>
      <section style={cards}>
        <Metric label="Validated candidates" value={consolidationSummary.inputCandidateCount} />
        <Metric label="Rule clusters" value={consolidationSummary.ruleClusterCount} />
        <Metric label="Canonical units" value={consolidationSummary.canonicalUnitCount} />
        <Metric label="Consolidation ratio" value={`${(consolidationSummary.consolidationRatio * 100).toFixed(2)}%`} />
        <Metric label="Composite units" value={consolidationSummary.compositeUnitCount} />
        <Metric label="Archive-only" value={consolidationSummary.archiveOnlyCount} />
        <Metric label="Conflict blocked" value={consolidationSummary.conflictBlockedCount} />
        <Metric label="Gap topics" value={consolidationSummary.gapTopicCount} />
      </section>
      <p><strong>Canonical status:</strong> {Object.entries(consolidationSummary.canonicalStatus).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Legacy 433 preview:</strong> {Object.entries(consolidationSummary.legacyMigration).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Canonical Set checksum:</strong> <code>{consolidationSummary.canonicalSetChecksum}</code></p>
      <table style={table}><thead><tr><th>Topic</th><th>Raw / Validated</th><th>Canonical</th><th>HIGH / MEDIUM</th><th>Composite</th><th>Conflict</th><th>Archive</th><th>Sources</th><th>Status</th></tr></thead><tbody>{canonicalTopicCoverage.map((topic) => <tr key={topic.topicId}><td>{topic.topicLabel}</td><td>{topic.rawCandidateCount} / {topic.validatedCandidateCount}</td><td>{topic.canonicalUnitCount}</td><td>{topic.canonicalHighCount} / {topic.canonicalMediumCount}</td><td>{topic.compositeUnitCount}</td><td>{topic.conflictBlockedCount}</td><td>{topic.archiveOnlyCount}</td><td>{topic.sourceDiversity}</td><td>{topic.status}</td></tr>)}</tbody></table>
      <h3>Topic gap reasons</h3>
      <table style={table}><thead><tr><th>Topic</th><th>Canonical units</th><th>Reasons</th><th>Recommendation</th></tr></thead><tbody>{topicGaps.map((gap) => <tr key={gap.topicId}><td>{gap.topicLabel}</td><td>{gap.canonicalUnitCount}</td><td>{gap.reasons.join(", ")}</td><td>{gap.recommendedAction}</td></tr>)}</tbody></table>
      <div style={warning}>Read-only canonical candidate set. It is not connected to the active KnowledgePack. Mutation count: {consolidationSummary.mutationCount}.</div>
    </>}
    <h2>Legal Shadow Pack runtime</h2>
    {!shadowSummary ? <p>Shadow runtime result is not available.</p> : <>
      <section style={cards}>
        <Metric label="Canonical Ready" value={shadowSummary.inputCanonicalUnits} />
        <Metric label="Compiler Compatible" value={Object.values(shadowSummary.compatibilitySummary).reduce((a,b)=>a+b,0)} />
        <Metric label="Question Eligible" value={shadowSummary.questionEligible} />
        <Metric label="Classic Generated" value={shadowSummary.classicGenerated} />
        <Metric label="Graph Generated" value={shadowSummary.graphGenerated} />
        <Metric label="Generation Success" value={`${(shadowSummary.yield.generationSuccessRate*100).toFixed(2)}%`} />
        <Metric label="Quality failures" value={shadowSummary.quality.uniquenessFailures+shadowSummary.quality.unsafeDistractors+shadowSummary.quality.sourceTraceFailures} />
        <Metric label="Semantic duplicate groups" value={shadowSummary.semanticDuplicates} />
      </section>
      <p><strong>Runtime status:</strong> {shadowSummary.status}</p>
      <p><strong>Topic readiness:</strong> {Object.entries(shadowSummary.topicRuntimeStatus).map(([status,count])=>`${status} ${count}`).join(" / ")}</p>
      <p><strong>Quality:</strong> average {shadowSummary.quality.averageScore.toFixed(3)}, uniqueness {shadowSummary.quality.uniquenessFailures}, duplicate distractor {shadowSummary.quality.duplicateDistractors}, unsafe {shadowSummary.quality.unsafeDistractors}, source trace {shadowSummary.quality.sourceTraceFailures}</p>
      <p><strong>Template gaps:</strong> {shadowSummary.templateGaps.map(g=>`${g.missingQuestionType} ${g.affectedKnowledgeCount} (${g.priority})`).join(" / ")||"none"}</p>
      <div style={warning}>Shadow artifacts are read-only and are not stored in the active Pack repository. Mutation count: {shadowSummary.mutationCount}.</div>
    </>}
    {hardeningSummary&&<><h2>Legal runtime hardening</h2><section style={cards}><Metric label="Status" value={hardeningSummary.status}/><Metric label="Supported templates" value={hardeningSummary.supportedTemplateCount}/><Metric label="Failures" value={hardeningSummary.failures}/><Metric label="Stem repetition" value={`${(hardeningSummary.stemRepetition*100).toFixed(2)}%`}/><Metric label="Graph usage" value={hardeningSummary.graphUsageScore.toFixed(3)}/><Metric label="Compile time" value={`${(hardeningSummary.performance.compileMs/1000).toFixed(2)}s`}/></section><p><strong>Template distribution:</strong> {Object.entries(hardeningSummary.templateDistribution).map(([k,v])=>`${k} ${v}`).join(" / ")}</p></>}
    <h2>Table overlay and footnote validation</h2>
    {!tableSummary ? <p>SOURCE-BATCH-002B artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Visual exceptions before" value={tableSummary.visualExceptionsBefore} />
        <Metric label="Visual exceptions after" value={tableSummary.visualExceptionsAfter} />
        <Metric label="Official rendered pages" value={tableSummary.officialRenderedPages} />
        <Metric label="Validated tables" value={tableSummary.scopeTables - tableSummary.manualReviewTables} />
        <Metric label="HIGH validated" value={tableSummary.validatedHighCandidates} />
        <Metric label="HIGH review" value={tableSummary.reviewRequiredHighCandidates} />
        <Metric label="HIGH rejected" value={tableSummary.rejectedHighCandidates} />
      </section>
      <table style={table}><thead><tr><th>Metric</th><th>Actual</th><th>Target</th></tr></thead><tbody>
        <QualityRow label="Footnote link rate" value={tableMetrics.footnoteLinkRate} target={0.90} />
        <QualityRow label="Visual match rate" value={tableMetrics.visualMatchRate} target={0.95} />
        <QualityRow label="HIGH candidate validation" value={tableMetrics.highCandidateValidationRate} target={1.00} />
      </tbody></table>
      <p><strong>Table Layer:</strong> {tableSummary.tableLayerStatus}</p>
      <table style={table}><thead><tr><th>Table</th><th>Severity</th><th>Regions</th><th>Affected candidates</th><th>Required action</th></tr></thead><tbody>{tableReviewQueue.map((item) => <tr key={item.tableId}><td><code>{item.tableId}</code></td><td>{item.severity}</td><td>{item.unresolvedRegions.join(", ") || "none"}</td><td>{item.affectedCandidateIds.length}</td><td>{item.requiredHumanAction}</td></tr>)}</tbody></table>
      <div style={warning}>Read-only validation. Footnote rate remains 0 when no marker-to-scope link is evidenced; it is not forced to pass. Mutation count: {tableSummary.mutationCount}.</div>
    </>}
    <h2>Attachment and annex ingestion</h2>
    {!annexSummary ? <p>SOURCE-BATCH-002 artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Attachments discovered" value={annexSummary.attachmentsDiscovered} />
        <Metric label="Attachments downloaded" value={annexSummary.attachmentsDownloaded} />
        <Metric label="Annexes" value={annexSummary.annexes} />
        <Metric label="Forms" value={annexSummary.forms} />
        <Metric label="Tables extracted" value={annexSummary.tablesExtracted} />
        <Metric label="Table Fact candidates" value={annexSummary.tableFactCandidates} />
        <Metric label="Relation candidates" value={annexSummary.relationCandidates} />
        <Metric label="Version conflicts" value={annexSummary.conflicts} />
        <Metric label="Manual acquisition required" value={annexSummary.manualAcquisitionRequired} />
      </section>
      <p><strong>224 reference resolution:</strong> {Object.entries(annexSummary.referenceStatus).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Exam relevance:</strong> {Object.entries(annexSummary.examRelevance).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <p><strong>Blocked jobs:</strong> {annexSummary.blockedJobsBefore} → {annexSummary.blockedJobsAfter}; <strong>Batch status:</strong> {annexSummary.status}</p>
      <table style={table}><thead><tr><th>Attachment</th><th>Type</th><th>Version</th><th>Status</th><th>Official / local</th></tr></thead><tbody>{attachments.map((attachment) => <tr key={attachment.attachmentId}><td>{attachment.title}</td><td>{attachment.attachmentType}</td><td>{attachment.versionStatus}</td><td>{attachment.validationStatus}</td><td><a href={attachment.officialPageUrl} target="_blank" rel="noreferrer">Official page</a><br/><code>{attachment.localPath ?? "MANUAL"}</code></td></tr>)}</tbody></table>
      <div style={warning}>{annexSummary.warnings.join(" ")} No candidate is eligible for automatic promotion.</div>
    </>}
    <h2>Parent-law attachments and table precision</h2>
    {!precisionSummary ? <p>SOURCE-BATCH-002A artifact is not available.</p> : <>
      <section style={cards}>
        <Metric label="Parent-law attachments" value={precisionSummary.attachmentsDiscovered} />
        <Metric label="Attachments downloaded" value={precisionSummary.attachmentsDownloaded} />
        <Metric label="Resolved references" value={precisionSummary.referenceStatus.RESOLVED ?? 0} />
        <Metric label="Blocked jobs remaining" value={precisionSummary.blockedJobsAfter} />
        <Metric label="Precision tables" value={precisionSummary.precisionTables} />
        <Metric label="Precision candidates" value={precisionSummary.precisionCandidates} />
        <Metric label="HIGH relevance" value={precisionSummary.examRelevance.HIGH ?? 0} />
        <Metric label="Visual exceptions" value={precisionSummary.visualExceptions} />
      </section>
      <p><strong>Parent status:</strong> {Object.entries(precisionSummary.blockedJobStatus).map(([source,status]) => `${source} ${status}`).join(" / ")}</p>
      <p><strong>224 reference resolution:</strong> {Object.entries(precisionSummary.referenceStatus).map(([status,count]) => `${status} ${count}`).join(" / ")}</p>
      <table style={table}><thead><tr><th>Metric</th><th>Actual</th><th>Target</th></tr></thead><tbody>
        <QualityRow label="Merged cell resolution" value={precisionSummary.qualityMetrics.mergedCellResolutionRate} target={0.95} />
        <QualityRow label="Condition preservation" value={precisionSummary.qualityMetrics.conditionPreservationRate} target={0.90} />
        <QualityRow label="Footnote linking" value={precisionSummary.qualityMetrics.footnoteLinkRate} target={0.90} />
        <QualityRow label="Numeric preservation" value={precisionSummary.qualityMetrics.numericPreservationRate} target={0.98} />
        <QualityRow label="Visual validation" value={precisionSummary.qualityMetrics.averageVisualMatchScore} target={0.95} />
      </tbody></table>
      <div style={warning}>Batch status: {precisionSummary.status}. Low-quality candidates remain blocked; no Pack, Fact, or Graph mutation was performed.</div>
    </>}
    <h2>Subject coverage</h2>
    <table style={table}><thead><tr><th>Subject</th><th>Topics with source</th><th>Total topics</th><th>Approved facts</th></tr></thead><tbody>{audit.subjectCoverage.map(([subject, value]) => <tr key={subject}><td>{subject}</td><td>{value.withSource}</td><td>{value.topics}</td><td>{value.approvedFacts}</td></tr>)}</tbody></table>
    <h2>Source inventory</h2>
    <table style={table}><thead><tr><th>Source</th><th>Authority</th><th>Currentness</th><th>File</th><th>Facts</th><th>Extraction</th></tr></thead><tbody>{audit.inventory.map((source) => <tr key={source.sourceId}><td>{source.title}</td><td>{source.sourceAuthority}</td><td>{source.currentStatus}</td><td>{source.filePath ?? "MISSING"}</td><td>{source.factCandidateCount}</td><td>{source.extractionStatus}</td></tr>)}</tbody></table>
    <h2>Highest-priority gaps</h2>
    <ul>{audit.gaps.slice(0, 20).map((gap) => <li key={gap.gapId}><strong>{gap.severity}</strong> · {gap.subject} / {gap.topic} · {gap.gapType}</li>)}</ul>
    <h2>Acquisition and ingestion</h2>
    <table style={table}><thead><tr><th>Priority</th><th>Source</th><th>Acquisition</th><th>Ingestion</th><th>Adapter</th></tr></thead><tbody>{audit.manifest.map((source) => { const job = audit.queue.find((item) => item.sourceId === source.sourceId); return <tr key={source.sourceId}><td>{source.ingestionPriority}</td><td>{source.expectedTitle}</td><td>{source.acquisitionStatus}</td><td>{job?.status}</td><td>{source.extractionAdapter}</td></tr>; })}</tbody></table>
    <h2>Source processing batches</h2>
    <ol>{audit.batches.map((batch) => <li key={batch.batchId}><strong>{batch.batchId}</strong> — {batch.title}; dependency: {batch.dependsOn.join(", ") || "none"}</li>)}</ol>
    <p>Read-only audit. Mutation count: {audit.mutationCount}. Current question count is intentionally not a batch completion condition.</p>
  </main>;
}

function Metric({ label, value }: { label: string; value: number | string }) { return <div style={card}><small>{label}</small><strong style={{ fontSize: 28 }}>{value}</strong></div>; }
function QualityRow({ label, value = 0, target }: { label: string; value?: number; target: number }) { return <tr><td>{label}</td><td>{value.toFixed(4)}</td><td>{target.toFixed(2)} {value >= target ? "PASS" : "PARTIAL"}</td></tr>; }
const layout = { maxWidth: 1200, margin: "36px auto", padding: 24, fontFamily: "system-ui, sans-serif", lineHeight: 1.5 } as const;
const cards = { display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 12, margin: "20px 0" } as const;
const card = { border: "1px solid #cbd5e1", borderRadius: 10, padding: 14, display: "grid", gap: 6 } as const;
const warning = { background: "#fff7ed", border: "1px solid #fb923c", color: "#9a3412", padding: 16, borderRadius: 10 } as const;
const notice = { background: "#eff6ff", border: "1px solid #60a5fa", color: "#1e3a8a", padding: 12, borderRadius: 10 } as const;
const table = { width: "100%", borderCollapse: "collapse", textAlign: "left", marginBottom: 28 } as const;
