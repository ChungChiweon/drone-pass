import type { SourceCoverageEntry } from "./source-coverage-matrix";

export type SourceGapType = "MISSING_OFFICIAL_SOURCE" | "MISSING_CURRENT_REVISION" | "MISSING_SUBJECT" | "MISSING_TOPIC" | "MISSING_TABLE_EXTRACTION" | "MISSING_IMAGE_DIAGRAM_EXTRACTION" | "MISSING_FORMULA_EXTRACTION" | "MISSING_OPERATIONAL_GUIDANCE" | "SOURCE_CONFLICT" | "SOURCE_OVERCONCENTRATION" | "OUTDATED_ONLY" | "UNDATED_ONLY";
export type SourceGap = { gapId: string; gapType: SourceGapType; subject: string; topic: string; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; currentSources: number; requiredSource: string; expectedValue: string; acquisitionMethod: string; ingestionMethod: string; priority: number };

export function analyzeSourceGaps(matrix: SourceCoverageEntry[]): SourceGap[] {
  return matrix.flatMap((entry) => {
    const gaps: SourceGap[] = [];
    if (!entry.sourceCount) gaps.push(gap(entry, "MISSING_TOPIC", "공식 원문", "해당 Topic의 최소 1개 현행 공식 Source", "기관 원문 수동 확보", adapter(entry.topicId), 100));
    else if (!entry.currentOfficialSourceCount) gaps.push(gap(entry, "MISSING_CURRENT_REVISION", "현행 공식 개정본", "시행일과 개정일이 확인된 Source", "공식 사이트에서 버전 확인", adapter(entry.topicId), 90));
    if (entry.knownConflicts.includes("UNDATED_SOURCE")) gaps.push(gap(entry, "UNDATED_ONLY", "발행일 확인본", "발행기관·발행일·개정일 확인", "원본 메타데이터 확보", "LEGAL_TEXT", 85));
    if (entry.topicId === "legal-tables" && entry.extractedSourceCount === 0) gaps.push(gap(entry, "MISSING_TABLE_EXTRACTION", "별표/기준표", "행·열·수치가 보존된 구조화 결과", "보유 PDF 재처리", "LEGAL_TABLE", 95));
    if (["flight-principles", "rotorcraft", "multicopter"].includes(entry.topicId) && !entry.sourceCount) gaps.push(gap(entry, "MISSING_IMAGE_DIAGRAM_EXTRACTION", "공식 도해 자료", "출처 locator가 있는 도해 설명", "공식 교재 확보", "IMAGE_DIAGRAM", 80));
    if (["newton", "bernoulli", "electricity"].includes(entry.topicId) && !entry.sourceCount) gaps.push(gap(entry, "MISSING_FORMULA_EXTRACTION", "공식 이론 교재", "기호·단위가 보존된 공식", "공식 교재 확보", "FORMULA", 80));
    return gaps;
  }).toSorted((a, b) => b.priority - a.priority || a.gapId.localeCompare(b.gapId));
}

function gap(entry: SourceCoverageEntry, gapType: SourceGapType, requiredSource: string, expectedValue: string, acquisitionMethod: string, ingestionMethod: string, priority: number): SourceGap {
  return { gapId: `gap:${entry.subject}:${entry.topicId}:${gapType}`, gapType, subject: entry.subject, topic: entry.topicId, severity: priority >= 95 ? "CRITICAL" : priority >= 80 ? "HIGH" : "MEDIUM", currentSources: entry.sourceCount, requiredSource, expectedValue, acquisitionMethod, ingestionMethod, priority };
}
function adapter(topicId: string) { return topicId === "legal-tables" ? "LEGAL_TABLE" : topicId.includes("weather") ? "EDUCATIONAL_TEXT" : "LEGAL_TEXT"; }
