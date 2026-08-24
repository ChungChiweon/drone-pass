export type TechnicalContext = "UAS_SPECIFIC" | "AVIATION_GENERAL" | "ELECTRICAL_GENERAL" | "BATTERY_GENERAL";
export type KnowledgeValidationStatus = "VALIDATED" | "VALIDATED_WITH_WARNING" | "BLOCKED";
export type FormulaValidationStatus = "FORMULA_VALIDATED" | "FORMULA_VALIDATED_WITH_WARNING" | "BLOCKED_FORMULA" | "PAGE_REVIEW_REQUIRED";
export type VisualValidationStatus = "SUPPORTIVE_VERIFIED" | "SUPPORTIVE_UNRESOLVED" | "REQUIRED_VERIFIED" | "REQUIRED_UNRESOLVED" | "NOT_RELEVANT";
export type TableValidationStatus = "TABLE_VALIDATED" | "TABLE_VALIDATED_WITH_WARNING" | "PAGE_REVIEW_REQUIRED" | "TABLE_REJECTED";

export type TechnicalValidationResult = {
  knowledgeId: string;
  knowledgeType: string;
  status: KnowledgeValidationStatus;
  score: number;
  blockers: string[];
  warnings: string[];
  technicalContext: TechnicalContext;
  questionConstraints: { allowed: string[]; prohibited: string[] };
};

export type TechnicalKnowledgeLike = {
  conceptId?: string; componentId?: string; knowledgeId?: string; relationshipId?: string;
  name?: string; title?: string; definition?: string; function?: string; statement?: string;
  rawEvidenceText?: string; technicalContext?: TechnicalContext;
  sourceReferences?: Array<{ sourceId?: string; page?: number; section?: string }>;
  warnings?: string[];
};

export const questionConstraintsFor = (context: TechnicalContext) => context === "ELECTRICAL_GENERAL"
  ? { allowed: ["ELECTRICAL_CONCEPT", "RELATIONSHIP_SELECTION"], prohibited: ["UAS_SPECIFIC_OPERATION"] }
  : context === "BATTERY_GENERAL"
    ? { allowed: ["BATTERY_CONCEPT", "BATTERY_SAFETY_CONCEPT"], prohibited: ["DRONE_LIPO_OPERATION", "DRONE_BATTERY_THRESHOLD"] }
    : context === "AVIATION_GENERAL"
      ? { allowed: ["COMPONENT_FUNCTION", "TECHNICAL_CONCEPT"], prohibited: ["UAS_SPECIFIC_OPERATION"] }
      : { allowed: ["TECHNICAL_CONCEPT"], prohibited: [] };

export function validateTechnicalKnowledge(item: TechnicalKnowledgeLike, knowledgeType: string, defaultContext: TechnicalContext): TechnicalValidationResult {
  const knowledgeId = item.conceptId ?? item.componentId ?? item.knowledgeId ?? item.relationshipId ?? "";
  const source = item.sourceReferences?.[0];
  const blockers = [!knowledgeId && "MISSING_ID", !(item.definition ?? item.function ?? item.statement) && "MISSING_CONTENT", !source?.sourceId && "MISSING_SOURCE", !source?.page && "MISSING_LOCATOR", !item.rawEvidenceText && "MISSING_RAW_EVIDENCE"].filter(Boolean) as string[];
  const context = item.technicalContext ?? defaultContext;
  const warnings = [...(item.warnings ?? [])];
  if (context !== "UAS_SPECIFIC" && !warnings.includes("GENERAL_TECHNICAL_CONTEXT")) warnings.push("GENERAL_TECHNICAL_CONTEXT");
  const score = blockers.length ? 0 : warnings.length ? 0.93 : 1;
  return { knowledgeId, knowledgeType, status: blockers.length ? "BLOCKED" : warnings.length ? "VALIDATED_WITH_WARNING" : "VALIDATED", score, blockers, warnings, technicalContext: context, questionConstraints: questionConstraintsFor(context) };
}
