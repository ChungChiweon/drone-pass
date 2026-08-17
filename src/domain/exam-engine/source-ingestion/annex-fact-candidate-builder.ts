import type { LegalAnnex } from "./legal-annex-extractor";

export type AnnexFactCandidate = {
  candidateId: string; sourceId: string; sourceVersionId: string; attachmentId: string; sourceLocator: string;
  tableId: string; rowId: string; columnContext: string[]; subject: string; predicate: string; value?: number;
  unit?: string; operator: "GTE" | "LTE" | "GT" | "LT" | "EQ" | "NONE"; lowerBound?: number; upperBound?: number;
  aggregateType?: string; conditions: string[]; exceptions: string[]; applicability: string[]; groupId: string;
  groupOperator: "AND" | "OR" | "NONE"; rawEvidenceText: string; normalizedStatement: string;
  extractionConfidence: number; tableStructureConfidence: number; currentnessStatus: "CURRENT_EFFECTIVE" | "UNKNOWN";
  standaloneQuestionAllowed: boolean; warnings: string[]; blockers: string[];
  examRelevance: "HIGH" | "MEDIUM" | "LOW" | "NONE" | "UNKNOWN"; relevanceReasons: string[];
  subjectArea: string; topic: string; likelyQuestionType: string;
};

export function buildAnnexFactCandidates(input: { sourceId: string; sourceVersionId: string; annex: LegalAnnex; current: boolean }): AnnexFactCandidate[] {
  const rows = new Map<number, typeof input.annex.cells>();
  for (const cell of input.annex.cells) rows.set(cell.rowIndex, [...(rows.get(cell.rowIndex) ?? []), cell]);
  return [...rows.entries()].flatMap(([rowIndex, cells]) => {
    const text = cells.sort((a, b) => a.columnIndex - b.columnIndex).map((cell) => cell.normalizedText).filter(Boolean).join(" | ");
    if (!text || rowIndex === 0) return [];
    const numeric = parseNumeric(text);
    const relevance = classifyExamRelevance(text);
    const composite = cells.filter((cell) => cell.normalizedText).length > 2;
    const blockers = ["SOURCE_INGESTION_UNVALIDATED"];
    if (!input.current) blockers.push("CURRENTNESS_UNVERIFIED");
    if (input.annex.visualVerificationRequired) blockers.push("VISUAL_VERIFICATION_REQUIRED");
    return [{ candidateId: `${input.annex.annexId}:row:${rowIndex}`, sourceId: input.sourceId, sourceVersionId: input.sourceVersionId, attachmentId: input.annex.attachmentId, sourceLocator: `${input.annex.sourceLocator} / row ${rowIndex}`, tableId: input.annex.annexId, rowId: String(rowIndex), columnContext: cells.flatMap((cell) => cell.inheritedHeaders), subject: cells[0]?.normalizedText ?? input.annex.title, predicate: "별표 기준", value: numeric.value, unit: numeric.unit, operator: numeric.operator, lowerBound: numeric.operator === "GTE" || numeric.operator === "GT" ? numeric.value : undefined, upperBound: numeric.operator === "LTE" || numeric.operator === "LT" ? numeric.value : undefined, aggregateType: composite ? "COMPOSITE_FACT" : "ATOMIC", conditions: extract(text, /[^|]*(?:경우|대상|조건)[^|]*/g), exceptions: extract(text, /[^|]*(?:다만|제외|예외)[^|]*/g), applicability: cells.slice(0, 2).map((cell) => cell.normalizedText).filter(Boolean), groupId: `${input.annex.annexId}:row:${rowIndex}`, groupOperator: composite ? "AND" : "NONE", rawEvidenceText: text, normalizedStatement: text.replace(/\s*\|\s*/g, " "), extractionConfidence: input.annex.visualVerificationRequired ? 0.55 : 0.85, tableStructureConfidence: input.annex.visualVerificationRequired ? 0.5 : 0.85, currentnessStatus: input.current ? "CURRENT_EFFECTIVE" : "UNKNOWN", standaloneQuestionAllowed: false, warnings: composite ? ["COMPOSITE_ROW_PRESERVED"] : [], blockers, examRelevance: relevance.level, relevanceReasons: relevance.reasons, subjectArea: "AVIATION_LAW", topic: relevance.topic, likelyQuestionType: numeric.value == null ? "CONDITION_JUDGMENT" : "NUMERIC_THRESHOLD" } satisfies AnnexFactCandidate];
  });
}

function parseNumeric(text: string): { value?: number; unit?: string; operator: AnnexFactCandidate["operator"] } {
  const match = /([\d,.]+)\s*(kg|g|cm|mm|m|시간|분|일|개월|년|만원|억원)?\s*(이상|이하|초과|미만)?/i.exec(text);
  if (!match) return { operator: "NONE" };
  return { value: Number(match[1].replace(/,/g, "")), unit: match[2], operator: match[3] === "이상" ? "GTE" : match[3] === "이하" ? "LTE" : match[3] === "초과" ? "GT" : match[3] === "미만" ? "LT" : "EQ" };
}
function extract(text: string, regex: RegExp) { return [...text.matchAll(regex)].map((match) => match[0].trim()); }
function classifyExamRelevance(text: string) {
  const high = ["조종자", "증명", "비행경력", "최대이륙중량", "신고", "인증", "승인", "과태료", "처분"];
  const medium = ["교육", "시험", "등록", "보험", "시설"];
  const highHits = high.filter((term) => text.includes(term));
  const mediumHits = medium.filter((term) => text.includes(term));
  return highHits.length ? { level: "HIGH" as const, reasons: highHits, topic: highHits[0] } : mediumHits.length ? { level: "MEDIUM" as const, reasons: mediumHits, topic: mediumHits[0] } : { level: "LOW" as const, reasons: ["No direct written-exam signal"], topic: "other" };
}
