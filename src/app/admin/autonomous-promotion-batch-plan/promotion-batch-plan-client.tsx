"use client";

import { useEffect, useState } from "react";
import { recalculateBatchOneFromCurrentState } from "@/domain/exam-engine/coverage/autonomous-promotion/batch-apply";
import { validateCanaryRuntime } from "@/domain/exam-engine/coverage/autonomous-promotion/canary";
import { createLocalKnowledgePackRepository } from "@/domain/exam-engine/import/local-knowledge-pack-repository";
import { createLocalKnowledgeGraphPersistenceRepository } from "@/domain/exam-engine/knowledge-graph/local-knowledge-graph-repository";

type Result = ReturnType<typeof recalculateBatchOneFromCurrentState>;

export default function PromotionBatchPlanClient() {
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        const stored = await createLocalKnowledgePackRepository().getActive();
        if (!stored) throw new Error("PACK_MISSING");
        const graph = await createLocalKnowledgeGraphPersistenceRepository().getActiveGraph(stored.id);
        if (!graph) throw new Error("ACTIVE_GRAPH_MISSING");
        const runtime = validateCanaryRuntime(stored.pack, graph.relations, ["AF-065", "AF-066"], 0);
        const approvedCount = stored.pack.atomicFacts.filter((fact) => fact.status === "approved").length;
        setResult(recalculateBatchOneFromCurrentState({
          packId: stored.id,
          pack: stored.pack,
          reportedApprovedCount: approvedCount,
          classicQuestionCount: runtime.classicGenerated,
          graphAwareQuestionCount: runtime.graphGenerated,
          activeGraphVersionId: graph.versionId,
          activeRelationCount: graph.relations.length,
          createdAt: new Date().toISOString()
        }));
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      }
    }
    void load();
  }, []);

  if (error) return <main><h1>Batch 1 Apply Plan</h1><p>{error}</p></main>;
  if (!result) return <main><h1>Batch 1 Apply Plan</h1><p>Loading repository...</p></main>;

  return (
    <main style={{ maxWidth: 1100, margin: "40px auto", padding: 24, fontFamily: "sans-serif" }}>
      <h1>Batch 1 Apply Plan — Read Only</h1>
      <p><strong>Historical development experiment:</strong> the 40-question target is excluded from current operations and is unrelated to full Source Coverage.</p>
      <p>Pack: {result.state.packId}</p>
      <p>Facts / Approved: {result.state.factCount} / {result.state.approvedCount}</p>
      <p>Classic / Graph-aware: {result.completionPlan?.currentClassicQuestionCount} / {result.completionPlan?.currentGraphAwareQuestionCount}</p>
      <p>Graph: {result.state.activeGraphVersionId} / {result.state.activeRelationCount}</p>
      <h2>Candidate reconciliation</h2>
      <table><thead><tr><th>Fact</th><th>Repository</th><th>Re-evaluation</th><th>Compiler</th></tr></thead>
        <tbody>{result.state.candidates.map((item) => {
          const evaluation = result.evaluations.find((value) => value.factId === item.factId);
          return <tr key={item.factId}><td>{item.factId}</td><td>{item.status}</td><td>{evaluation?.decision ?? "-"}</td><td>{String(evaluation?.compilerEligible ?? false)}</td></tr>;
        })}</tbody>
      </table>
      <h2>Promotion units</h2>
      <ul>{result.units.map((unit) => <li key={unit.unitId}>{unit.unitId}: {unit.factIds.join(", ")} / eligible={String(unit.eligible)} / risk={unit.risk}</li>)}</ul>
      <h2>Plan</h2>
      <pre>{JSON.stringify({ readiness: result.completionPlan?.readiness, selectedUnits: result.completionPlan?.selectedUnits, stages: result.stagedPlan?.stages, batch2: result.batch2, mutationCount: result.mutationCount, manifestChecksum: result.manifest?.checksum }, null, 2)}</pre>
      <p>No Apply control is available on this page.</p>
    </main>
  );
}
