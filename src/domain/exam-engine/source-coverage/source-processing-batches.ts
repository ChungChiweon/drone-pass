import type { SourceAcquisitionItem } from "./source-acquisition-manifest";

export type SourceProcessingBatch = { batchId: string; title: string; sourceIds: string[]; expectedTopics: string[]; extractionAdapters: string[]; validationCriteria: string[]; completionConditions: string[]; dependsOn: string[] };

export function planSourceProcessingBatches(manifest: SourceAcquisitionItem[]): SourceProcessingBatch[] {
  const sourceIds = (subject: string) => manifest.filter((item) => item.subject === subject).map((item) => item.sourceId);
  return [
    batch("SOURCE-BATCH-001", "현행 법규", sourceIds("AVIATION_LAW"), ["law-system", "revision-history", "pilot-certification"], ["LEGAL_TEXT"], []),
    batch("SOURCE-BATCH-002", "운영세칙·별표", sourceIds("AVIATION_LAW"), ["operating-rules", "legal-tables"], ["LEGAL_TEXT", "LEGAL_TABLE"], ["SOURCE-BATCH-001"]),
    batch("SOURCE-BATCH-003", "항공기상 기초", sourceIds("AVIATION_WEATHER"), ["atmosphere", "pressure", "temperature", "wind", "cloud"], ["EDUCATIONAL_TEXT", "TECHNICAL_TABLE"], ["SOURCE-BATCH-001"]),
    batch("SOURCE-BATCH-004", "위험 기상", sourceIds("AVIATION_WEATHER"), ["turbulence", "wind-shear", "icing", "thunderstorm", "visibility"], ["EDUCATIONAL_TEXT", "IMAGE_DIAGRAM"], ["SOURCE-BATCH-003"]),
    batch("SOURCE-BATCH-005", "비행원리", sourceIds("FLIGHT_THEORY_OPERATION"), ["flight-principles", "lift", "drag", "stability-control"], ["EDUCATIONAL_TEXT", "FORMULA", "IMAGE_DIAGRAM"], ["SOURCE-BATCH-001"]),
    batch("SOURCE-BATCH-006", "기체·전기·배터리", sourceIds("FLIGHT_THEORY_OPERATION"), ["multicopter", "motor", "esc", "battery", "electricity"], ["EDUCATIONAL_TEXT", "TECHNICAL_TABLE"], ["SOURCE-BATCH-005"]),
    batch("SOURCE-BATCH-007", "운용·점검·비상절차", sourceIds("FLIGHT_THEORY_OPERATION"), ["preflight", "inflight", "postflight", "emergency"], ["EDUCATIONAL_TEXT"], ["SOURCE-BATCH-006"]),
    batch("SOURCE-BATCH-008", "인적요인·안전관리", sourceIds("FLIGHT_THEORY_OPERATION"), ["human-factors", "crm", "risk-management", "accident-prevention"], ["EDUCATIONAL_TEXT"], ["SOURCE-BATCH-007"])
  ];
}
function batch(batchId: string, title: string, sourceIds: string[], expectedTopics: string[], extractionAdapters: string[], dependsOn: string[]): SourceProcessingBatch { return { batchId, title, sourceIds: [...new Set(sourceIds)], expectedTopics, extractionAdapters, validationCriteria: ["공식 Source와 locator 확인", "버전·시행일 확인", "추출 손실·중복 없음"], completionConditions: ["필수 Source 확보", "추출·검증 작업 완료", "Coverage Matrix 갱신"], dependsOn }; }
