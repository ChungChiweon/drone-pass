export type AttachmentReferenceEdge = { edgeId: string; fromNodeId: string; toNodeId: string; relationType: "REFERENCES_ATTACHMENT" | "IMPLEMENTED_BY_ATTACHMENT" | "PENALTY_DEFINED_IN" | "FORM_REQUIRED_BY" | "CRITERIA_DEFINED_IN" | "EXCEPTION_DEFINED_IN" | "SUPERSEDES_ATTACHMENT" | "VERSION_OF"; sourceLocator: string; evidenceText: string };
export function buildAttachmentReferenceGraph(edges: AttachmentReferenceEdge[]) {
  const nodes = [...new Set(edges.flatMap((edge) => [edge.fromNodeId, edge.toNodeId]))].map((nodeId) => ({ nodeId }));
  return { nodes, edges: edges.filter((edge) => edge.sourceLocator && edge.evidenceText) };
}
