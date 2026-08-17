export type SourceAuthority = "OFFICIAL_LAW" | "OFFICIAL_AGENCY" | "OFFICIAL_EDUCATION" | "PUBLIC_INSTITUTION" | "TEXTBOOK" | "THIRD_PARTY" | "UNKNOWN";
export type SourceCurrentStatus = "CURRENT" | "POSSIBLY_OUTDATED" | "OUTDATED" | "UNDATED" | "UNKNOWN";

export type DroneSourceInventoryItem = {
  sourceId: string;
  filePath: string | null;
  fileName: string | null;
  fileType: string;
  title: string;
  issuingOrganization: string;
  publicationDate?: string;
  revisionDate?: string;
  effectiveDate?: string;
  pageCount?: number;
  subjectArea: string[];
  topicCoverage: string[];
  sourceAuthority: SourceAuthority;
  currentStatus: SourceCurrentStatus;
  extractionStatus: "EXTRACTED" | "REPROCESS_REQUIRED" | "MISSING_FILE";
  factCandidateCount: number;
  approvedFactCount: number;
  knownIssues: string[];
  duplicateGroup?: string;
  checksum?: string;
};

export const DRONE_SOURCE_INVENTORY: DroneSourceInventoryItem[] = [
  {
    sourceId: "ts-drone-aviation-safety-2021",
    filePath: "docs/1. 항공안전법 (1).pdf",
    fileName: "1. 항공안전법 (1).pdf",
    fileType: "pdf",
    title: "항공안전법 무인동력비행장치 온라인교육",
    issuingOrganization: "한국교통안전공단",
    publicationDate: "2021",
    pageCount: 35,
    subjectArea: ["AVIATION_LAW"],
    topicCoverage: ["law-system", "device-definition", "pilot-certification", "device-report", "safety-certification", "flight-approval", "pilot-compliance", "operating-rules", "legal-tables"],
    sourceAuthority: "OFFICIAL_EDUCATION",
    currentStatus: "POSSIBLY_OUTDATED",
    extractionStatus: "REPROCESS_REQUIRED",
    factCandidateCount: 215,
    approvedFactCount: 11,
    knownIssues: ["2021 교육자료로 현행성 재검증 필요", "법령·시행령·시행규칙이 한 자료에 요약됨", "표와 슬라이드 구조 재추출 필요"],
    checksum: "sha256-4fcaaad959fb95aee461b277736b8494a3b4ad3d964e6e8ad9ece426149d57cd"
  },
  {
    sourceId: "aviation-business-act-training-undated",
    filePath: null,
    fileName: null,
    fileType: "unknown",
    title: "항공사업법 드론 자격 교육자료",
    issuingOrganization: "발행기관 미상",
    subjectArea: ["AVIATION_LAW"],
    topicCoverage: ["aviation-business-act", "insurance-business", "penalties", "legal-tables"],
    sourceAuthority: "UNKNOWN",
    currentStatus: "UNDATED",
    extractionStatus: "MISSING_FILE",
    factCandidateCount: 218,
    approvedFactCount: 19,
    knownIssues: ["원본 파일 없음", "발행기관·발행연도 미상", "현행 법령과 대조 필요"]
  }
];

export function findDuplicateChecksums(items: DroneSourceInventoryItem[]) {
  const groups = new Map<string, string[]>();
  for (const item of items) if (item.checksum) groups.set(item.checksum, [...(groups.get(item.checksum) ?? []), item.sourceId]);
  return [...groups.entries()].filter(([, ids]) => ids.length > 1).map(([checksum, sourceIds]) => ({ checksum, sourceIds }));
}
