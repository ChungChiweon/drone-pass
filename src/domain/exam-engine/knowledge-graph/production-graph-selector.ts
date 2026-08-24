import type { KnowledgeRelation } from "@/domain/exam-engine/types";
import type { KnowledgeGraphVersion } from "./graph-versioning";

export function getProductionGraph(relations: KnowledgeRelation[], activeVersion: KnowledgeGraphVersion | null): KnowledgeRelation[] {
  if (!activeVersion || activeVersion.status !== "active") return [];
  return relations.filter((relation) => relation.packId === activeVersion.packId && relation.reviewStatus === "approved");
}
