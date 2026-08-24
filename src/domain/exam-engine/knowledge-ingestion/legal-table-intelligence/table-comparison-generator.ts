import type { KnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { TableFactCandidate, TableRelationCandidate } from "./legal-table-structure";

export function generateTableComparisonRelations(source: KnowledgeSourceInput, candidates: TableFactCandidate[]): TableRelationCandidate[] {
  const groups = groupBy(candidates, (candidate) => `${candidate.tableMetadata.tableId}:${candidate.tableMetadata.rowId}`);
  return Object.values(groups).flatMap((items) => relationPairs(source, items));
}

function relationPairs(source: KnowledgeSourceInput, candidates: TableFactCandidate[]) {
  const relations: TableRelationCandidate[] = [];
  for (let leftIndex = 0; leftIndex < candidates.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < candidates.length; rightIndex += 1) {
      const left = candidates[leftIndex];
      const right = candidates[rightIndex];
      if (!left || !right) continue;
      if (!isComparable(left, right)) continue;
      const relationType = sameUnit(left, right) ? "COMPARISON_PAIR" : "CONFUSED_WITH";
      relations.push({
        id: `KGTABLE-${relationType}-${left.candidateId}-${right.candidateId}`.replace(/[^\p{L}\p{N}-]+/gu, "-"),
        packId: source.sourceId,
        fromFactId: left.candidateId,
        toFactId: right.candidateId,
        relationType,
        reason: [
          "same table row",
          `row=${left.tableMetadata.rowId}`,
          `left column=${left.tableMetadata.column}`,
          `right column=${right.tableMetadata.column}`,
          sameUnit(left, right) ? "same unit" : "different unit or missing unit",
          "table comparison candidate"
        ].join("; "),
        confidence: sameUnit(left, right) ? 0.82 : 0.7,
        sourceReference: left.sourceReference,
        createdAt: "simulation",
        reviewStatus: "draft"
      });
    }
  }
  return relations;
}

function isComparable(left: TableFactCandidate, right: TableFactCandidate) {
  if (left.candidateId === right.candidateId) return false;
  if (left.tableMetadata.value === right.tableMetadata.value) return false;
  return Boolean(left.extractedNumbers.length || right.extractedNumbers.length);
}

function sameUnit(left: TableFactCandidate, right: TableFactCandidate) {
  return Boolean(left.tableMetadata.unit && left.tableMetadata.unit === right.tableMetadata.unit);
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const groupKey = key(item);
    acc[groupKey] = acc[groupKey] ?? [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}
