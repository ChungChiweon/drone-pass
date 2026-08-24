export type LegalValidationEligibility =
  | "ELIGIBLE"
  | "ELIGIBLE_WITH_WARNINGS"
  | "BLOCKED_TABLE_UNRESOLVED"
  | "BLOCKED_SOURCE_UNVERIFIABLE"
  | "BLOCKED_CONFLICT"
  | "BLOCKED_LOW_QUALITY";

export type LegalValidationCandidate = {
  candidateId: string;
  sourceId: string;
  subject?: string;
  predicate?: string;
  normalizedStatement?: string;
  examRelevance: "HIGH" | "MEDIUM" | "LOW" | "NONE" | "UNKNOWN";
  validationEligibility: LegalValidationEligibility;
  blockers: string[];
};

export type LegalValidationBatch = {
  batchId: string;
  topic: string;
  candidateIds: string[];
  sourceIds: string[];
  expectedConflicts: string[];
  blockedCandidateIds: string[];
  readyCandidateIds: string[];
  candidateCount: number;
  eligibleCount: number;
  eligibleWithWarningsCount: number;
  blockedCount: number;
  highRelevanceCount: number;
  mediumRelevanceCount: number;
  unresolvedConflictCount: number;
  status: "READY" | "PARTIAL" | "BLOCKED";
};

const RULES: Array<{ id: string; topic: string; terms: RegExp }> = [
  { id: "001", topic: "정의·분류", terms: /정의|분류|종류|구분/ },
  { id: "002", topic: "조종자 증명·자격 기준", terms: /조종자|증명|자격|교육|시험/ },
  { id: "003", topic: "신고·안전성인증", terms: /신고|안전성인증|검사/ },
  { id: "004", topic: "비행승인·특별비행", terms: /비행승인|특별비행|공역/ },
  { id: "005", topic: "준수사항·금지·예외", terms: /준수|금지|제한|예외|의무/ },
  { id: "006", topic: "행정처분·벌칙·과태료", terms: /행정처분|벌칙|과태료|벌금|징역/ },
  { id: "007", topic: "항공사업법 관련", terms: /항공사업|사용사업|대여업|레저스포츠/ },
];

export function planLegalValidationBatches(candidates: LegalValidationCandidate[]): LegalValidationBatch[] {
  const groups = new Map<string, { id: string; topic: string; candidates: LegalValidationCandidate[] }>();
  const fallback = { id: "008", topic: "기타 HIGH/MEDIUM", terms: /(?:)/ };
  for (const candidate of candidates.filter((item) => item.examRelevance === "HIGH" || item.examRelevance === "MEDIUM")) {
    const text = [candidate.subject, candidate.predicate, candidate.normalizedStatement].filter(Boolean).join(" ");
    const rule = RULES.find((item) => item.terms.test(text)) ?? fallback;
    const group = groups.get(rule.id) ?? { id: rule.id, topic: rule.topic, candidates: [] };
    group.candidates.push(candidate);
    groups.set(rule.id, group);
  }
  return [...groups.values()].sort((a, b) => a.id.localeCompare(b.id)).map(({ id, topic, candidates: items }) => {
    const ready = items.filter((item) => item.validationEligibility === "ELIGIBLE" || item.validationEligibility === "ELIGIBLE_WITH_WARNINGS");
    const blocked = items.filter((item) => !ready.includes(item));
    return {
      batchId: `VALIDATION-BATCH-${id}`,
      topic,
      candidateIds: items.map((item) => item.candidateId),
      sourceIds: [...new Set(items.map((item) => item.sourceId))],
      expectedConflicts: [...new Set(items.flatMap((item) => item.blockers.filter((blocker) => blocker.includes("CONFLICT"))))],
      blockedCandidateIds: blocked.map((item) => item.candidateId),
      readyCandidateIds: ready.map((item) => item.candidateId),
      candidateCount: items.length,
      eligibleCount: items.filter((item) => item.validationEligibility === "ELIGIBLE").length,
      eligibleWithWarningsCount: items.filter((item) => item.validationEligibility === "ELIGIBLE_WITH_WARNINGS").length,
      blockedCount: blocked.length,
      highRelevanceCount: items.filter((item) => item.examRelevance === "HIGH").length,
      mediumRelevanceCount: items.filter((item) => item.examRelevance === "MEDIUM").length,
      unresolvedConflictCount: items.filter((item) => item.validationEligibility === "BLOCKED_CONFLICT").length,
      status: ready.length === 0 ? "BLOCKED" : blocked.length ? "PARTIAL" : "READY",
    };
  });
}
