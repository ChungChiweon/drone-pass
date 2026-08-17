import type { DroneSourceInventoryItem, SourceAuthority } from "./source-inventory";

export type AcquisitionStatus = "ALREADY_AVAILABLE" | "MISSING" | "URL_IDENTIFIED" | "DOWNLOAD_REQUIRED" | "MANUAL_ACQUISITION_REQUIRED" | "BLOCKED";
export type SourceAcquisitionItem = { sourceId: string; expectedTitle: string; organization: string; subject: string; topics: string[]; authority: SourceAuthority; requiredCurrentness: string; acquisitionStatus: AcquisitionStatus; sourceUrl: string | null; localPath: string | null; licenseOrUsageNote: string; ingestionPriority: number; extractionAdapter: string; verificationRequired: boolean };

export function buildSourceAcquisitionManifest(inventory: DroneSourceInventoryItem[]): SourceAcquisitionItem[] {
  const available = inventory.map((source) => ({ sourceId: source.sourceId, expectedTitle: source.title, organization: source.issuingOrganization, subject: source.subjectArea[0], topics: source.topicCoverage, authority: source.sourceAuthority, requiredCurrentness: "현행성 확인", acquisitionStatus: source.filePath ? "ALREADY_AVAILABLE" as const : "MANUAL_ACQUISITION_REQUIRED" as const, sourceUrl: null, localPath: source.filePath, licenseOrUsageNote: "원문 이용조건 확인 필요", ingestionPriority: source.currentStatus === "UNDATED" ? 1 : 2, extractionAdapter: source.topicCoverage.includes("legal-tables") ? "LEGAL_TABLE" : "LEGAL_TEXT", verificationRequired: true }));
  return [...available,
    missing("current-aviation-safety-act", "현행 항공안전법·시행령·시행규칙", "국가법령정보센터", "AVIATION_LAW", ["law-system", "revision-history", "legal-tables"], "OFFICIAL_LAW", 1, "LEGAL_TEXT"),
    missing("official-exam-scope", "초경량비행장치 조종자 학과시험 공식 과목·범위", "한국교통안전공단", "AVIATION_LAW", ["law-system"], "OFFICIAL_AGENCY", 1, "EDUCATIONAL_TEXT"),
    missing("pilot-certification-operating-rules", "무인비행장치 조종자 증명 운영세칙", "한국교통안전공단", "AVIATION_LAW", ["pilot-certification", "operating-rules"], "OFFICIAL_AGENCY", 1, "LEGAL_TEXT"),
    missing("official-aviation-weather-course", "드론 학과시험 항공기상 공식 교육자료", "항공기상청/한국교통안전공단", "AVIATION_WEATHER", ["atmosphere", "wind", "cloud", "weather-report", "uas-weather-judgment"], "OFFICIAL_EDUCATION", 2, "EDUCATIONAL_TEXT"),
    missing("official-flight-theory-course", "드론 비행이론 공식 표준 교육자료", "한국교통안전공단/국토교통부", "FLIGHT_THEORY_OPERATION", ["flight-principles", "lift", "drag", "stability-control", "rotorcraft"], "OFFICIAL_EDUCATION", 3, "EDUCATIONAL_TEXT"),
    missing("official-drone-operation-course", "드론 운용·점검·비상절차 공식 교육자료", "한국교통안전공단/국토교통부", "FLIGHT_THEORY_OPERATION", ["preflight", "inflight", "postflight", "emergency", "risk-management"], "OFFICIAL_EDUCATION", 3, "EDUCATIONAL_TEXT")
  ];
}
function missing(sourceId: string, expectedTitle: string, organization: string, subject: string, topics: string[], authority: SourceAuthority, ingestionPriority: number, extractionAdapter: string): SourceAcquisitionItem { return { sourceId, expectedTitle, organization, subject, topics, authority, requiredCurrentness: "현행본", acquisitionStatus: "MISSING", sourceUrl: null, localPath: null, licenseOrUsageNote: "공식 배포 페이지와 이용조건 확인 필요", ingestionPriority, extractionAdapter, verificationRequired: true }; }
