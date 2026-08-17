import type { AtomicFact, Concept } from "@/domain/exam-engine/types";
import { DRONE_EXAM_TAXONOMY, type DroneExamTaxonomyTopic } from "./drone-exam-taxonomy";
import type { DroneSourceInventoryItem } from "./source-inventory";

export type CoverageStatus = "NO_SOURCE" | "SOURCE_ONLY" | "PARTIALLY_EXTRACTED" | "EXTRACTED" | "VALIDATED" | "PRODUCTION_READY";
export type SourceCoverageEntry = {
  subject: string;
  topicId: string;
  topicLabel: string;
  sourceCount: number;
  officialSourceCount: number;
  currentOfficialSourceCount: number;
  extractedSourceCount: number;
  candidateFactCount: number;
  approvedFactCount: number;
  coverageStatus: CoverageStatus;
  confidence: number;
  missingSourceTypes: string[];
  knownConflicts: string[];
  priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
};

export function mapFactToTaxonomy(fact: AtomicFact, concepts: Concept[], taxonomy = DRONE_EXAM_TAXONOMY): DroneExamTaxonomyTopic | undefined {
  const concept = concepts.find((item) => item.id === fact.conceptId);
  const text = [fact.subject, fact.predicate, fact.statement, concept?.title, concept?.summary, ...(concept?.categoryIds ?? [])].join(" ").toLowerCase();
  const categoryText = (concept?.categoryIds ?? []).join(" ");
  const categoryRules: Array<[string, string]> = [
    ["report", "device-report"], ["safety-certification", "safety-certification"], ["flight-approval", "flight-approval"],
    ["pilot-certificate", "pilot-certification"], ["pilot-compliance", "pilot-compliance"], ["penalty", "penalties"],
    ["insurance", "insurance-business"], ["aviation-business", "aviation-business-act"], ["device-definition", "device-definition"]
  ];
  const categoryTopic = categoryRules.find(([pattern]) => categoryText.includes(pattern))?.[1];
  if (categoryTopic) return taxonomy.find((topic) => topic.id === categoryTopic);
  const allowedTaxonomy = concept?.subjectId.endsWith("-act") ? taxonomy.filter((topic) => topic.subject === "AVIATION_LAW") : taxonomy;
  return allowedTaxonomy
    .map((topic) => ({ topic, score: topic.keywords.filter((keyword) => text.includes(keyword.toLowerCase())).length }))
    .filter((value) => value.score > 0)
    .toSorted((a, b) => b.score - a.score || a.topic.id.localeCompare(b.topic.id))[0]?.topic
    ?? (concept?.subjectId.includes("aviation") ? taxonomy.find((topic) => topic.id === "aviation-business-act") : undefined);
}

export function calculateSourceCoverageMatrix(input: { inventory: DroneSourceInventoryItem[]; facts: AtomicFact[]; concepts: Concept[]; taxonomy?: DroneExamTaxonomyTopic[] }): SourceCoverageEntry[] {
  const taxonomy = input.taxonomy ?? DRONE_EXAM_TAXONOMY;
  const factTopics = new Map(input.facts.map((fact) => [fact.id, mapFactToTaxonomy(fact, input.concepts, taxonomy)?.id]));
  return taxonomy.map((topic) => {
    const sources = input.inventory.filter((source) => source.topicCoverage.includes(topic.id));
    const mappedFacts = input.facts.filter((fact) => factTopics.get(fact.id) === topic.id);
    const official = sources.filter((source) => source.sourceAuthority.startsWith("OFFICIAL_"));
    const currentOfficial = official.filter((source) => source.currentStatus === "CURRENT");
    const extracted = sources.filter((source) => source.extractionStatus === "EXTRACTED");
    const approvedFactCount = mappedFacts.filter((fact) => fact.status === "approved").length;
    let coverageStatus: CoverageStatus = "NO_SOURCE";
    if (sources.length) coverageStatus = "SOURCE_ONLY";
    if (sources.some((source) => source.extractionStatus === "REPROCESS_REQUIRED")) coverageStatus = "PARTIALLY_EXTRACTED";
    if (extracted.length) coverageStatus = "EXTRACTED";
    if (approvedFactCount && currentOfficial.length) coverageStatus = "VALIDATED";
    // Production readiness requires broad, current, official evidence and cannot be inferred from Fact volume alone.
    if (currentOfficial.length >= 2 && extracted.length >= 2 && approvedFactCount >= 2 && topic.officiallyVerified) coverageStatus = "PRODUCTION_READY";
    const confidence = Math.min(1, currentOfficial.length * 0.35 + extracted.length * 0.2 + Math.min(approvedFactCount, 3) * 0.1);
    return {
      subject: topic.subject,
      topicId: topic.id,
      topicLabel: topic.label,
      sourceCount: sources.length,
      officialSourceCount: official.length,
      currentOfficialSourceCount: currentOfficial.length,
      extractedSourceCount: extracted.length,
      candidateFactCount: mappedFacts.length,
      approvedFactCount,
      coverageStatus,
      confidence,
      missingSourceTypes: currentOfficial.length ? [] : ["CURRENT_OFFICIAL_SOURCE"],
      knownConflicts: sources.some((source) => source.currentStatus === "UNDATED") ? ["UNDATED_SOURCE"] : [],
      priority: sources.length === 0 ? "CRITICAL" : currentOfficial.length === 0 ? "HIGH" : approvedFactCount === 0 ? "MEDIUM" : "LOW"
    };
  });
}
