import type { AtomicFact, KnowledgePack } from "@/domain/exam-engine/types";

export type KnowledgePackValidationIssue = {
  severity: "error" | "warning";
  code: string;
  path: string;
  message: string;
};

export type KnowledgePackValidationResult = {
  valid: boolean;
  errors: KnowledgePackValidationIssue[];
  warnings: KnowledgePackValidationIssue[];
};

const FACT_STATUSES = new Set(["draft", "approved", "expired"]);
const OPERATORS = new Set(["eq", "neq", "gt", "gte", "lt", "lte"]);
const QUESTION_TYPES = new Set(["SELECT_TRUE", "SELECT_FALSE", "NUMERIC_THRESHOLD", "CONCEPT_COMPARISON", "CASE_JUDGMENT"]);
const MUTATION_TYPES = new Set([
  "NUMERIC_NEARBY",
  "BOUNDARY_OPERATOR_SWAP",
  "UNIT_SWAP",
  "AUTHORITY_SWAP",
  "CONDITION_OMISSION",
  "EXCEPTION_OMISSION",
  "SIBLING_FACT_SWAP"
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function pushIssue(
  issues: KnowledgePackValidationIssue[],
  severity: KnowledgePackValidationIssue["severity"],
  code: string,
  path: string,
  message: string
) {
  issues.push({ severity, code, path, message });
}

function checkUniqueIds(items: unknown[], path: string, issues: KnowledgePackValidationIssue[]) {
  const seen = new Set<string>();
  items.forEach((item, index) => {
    if (!isRecord(item) || !isNonEmptyString(item.id)) return;
    const id = String(item.id);
    if (seen.has(id)) {
      pushIssue(issues, "error", "DUPLICATE_ID", `${path}[${index}].id`, `Duplicate id: ${item.id}`);
    }
    seen.add(id);
  });
}

function requireString(item: unknown, key: string, path: string, issues: KnowledgePackValidationIssue[]) {
  if (!isRecord(item) || !isNonEmptyString(item[key])) {
    pushIssue(issues, "error", "REQUIRED_STRING", `${path}.${key}`, "Required string field is missing.");
  }
}

function validateTopLevel(pack: unknown, issues: KnowledgePackValidationIssue[]) {
  if (!isRecord(pack)) {
    pushIssue(issues, "error", "INVALID_PACK", "$", "Knowledge Pack must be an object.");
    return;
  }

  if (!isRecord(pack.domainPack)) {
    pushIssue(issues, "error", "MISSING_DOMAIN_PACK", "$.domainPack", "domainPack is required.");
  }

  for (const key of ["sourceDocuments", "sourceRevisions", "concepts", "atomicFacts", "questionTemplates", "distractorRules"]) {
    if (!Array.isArray(pack[key])) {
      pushIssue(issues, "error", "REQUIRED_ARRAY", `$.${key}`, `${key} must be an array.`);
    }
  }

  if (isRecord(pack.domainPack)) {
    for (const key of ["exams", "subjects", "categories"]) {
      if (!Array.isArray(pack.domainPack[key])) {
        pushIssue(issues, "error", "REQUIRED_ARRAY", `$.domainPack.${key}`, `domainPack.${key} must be an array.`);
      }
    }
  }
}

export function validateKnowledgePack(input: unknown): KnowledgePackValidationResult {
  const issues: KnowledgePackValidationIssue[] = [];
  validateTopLevel(input, issues);

  if (!isRecord(input) || !isRecord(input.domainPack)) {
    return splitIssues(issues);
  }

  const exams = asArray(input.domainPack.exams);
  const subjects = asArray(input.domainPack.subjects);
  const categories = asArray(input.domainPack.categories);
  const sourceDocuments = asArray(input.sourceDocuments);
  const sourceRevisions = asArray(input.sourceRevisions);
  const concepts = asArray(input.concepts);
  const atomicFacts = asArray(input.atomicFacts);
  const questionTemplates = asArray(input.questionTemplates);
  const distractorRules = asArray(input.distractorRules);

  [
    [exams, "$.domainPack.exams"],
    [subjects, "$.domainPack.subjects"],
    [categories, "$.domainPack.categories"],
    [sourceDocuments, "$.sourceDocuments"],
    [sourceRevisions, "$.sourceRevisions"],
    [concepts, "$.concepts"],
    [atomicFacts, "$.atomicFacts"],
    [questionTemplates, "$.questionTemplates"],
    [distractorRules, "$.distractorRules"]
  ].forEach(([items, path]) => checkUniqueIds(items as unknown[], path as string, issues));

  const examIds = new Set(exams.filter(isRecord).map((item) => String(item.id)));
  const subjectIds = new Set(subjects.filter(isRecord).map((item) => String(item.id)));
  const categoryIds = new Set(categories.filter(isRecord).map((item) => String(item.id)));
  const documentIds = new Set(sourceDocuments.filter(isRecord).map((item) => String(item.id)));
  const revisionIds = new Set(sourceRevisions.filter(isRecord).map((item) => String(item.id)));
  const conceptIds = new Set(concepts.filter(isRecord).map((item) => String(item.id)));
  const factIds = new Set(atomicFacts.filter(isRecord).map((item) => String(item.id)));

  exams.forEach((exam, index) => {
    const path = `$.domainPack.exams[${index}]`;
    ["id", "title", "countryCode", "description"].forEach((key) => requireString(exam, key, path, issues));
    if (!isRecord(exam) || !Array.isArray(exam.subjectIds)) pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.subjectIds`, "subjectIds must be an array.");
  });

  subjects.forEach((subject, index) => {
    const path = `$.domainPack.subjects[${index}]`;
    ["id", "examId", "title", "description"].forEach((key) => requireString(subject, key, path, issues));
    if (isRecord(subject) && isNonEmptyString(subject.examId) && !examIds.has(String(subject.examId))) {
      pushIssue(issues, "error", "MISSING_EXAM", `${path}.examId`, `Exam does not exist: ${subject.examId}`);
    }
    if (!isRecord(subject) || !Array.isArray(subject.categoryIds)) pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.categoryIds`, "categoryIds must be an array.");
  });

  categories.forEach((category, index) => {
    const path = `$.domainPack.categories[${index}]`;
    ["id", "subjectId", "title"].forEach((key) => requireString(category, key, path, issues));
    if (isRecord(category) && isNonEmptyString(category.subjectId) && !subjectIds.has(String(category.subjectId))) {
      pushIssue(issues, "error", "MISSING_SUBJECT", `${path}.subjectId`, `Subject does not exist: ${category.subjectId}`);
    }
    if (isRecord(category) && isNonEmptyString(category.parentId) && !categoryIds.has(String(category.parentId))) {
      pushIssue(issues, "error", "MISSING_PARENT_CATEGORY", `${path}.parentId`, `Parent category does not exist: ${category.parentId}`);
    }
  });

  sourceDocuments.forEach((document, index) => {
    const path = `$.sourceDocuments[${index}]`;
    ["id", "title", "publisher", "note"].forEach((key) => requireString(document, key, path, issues));
  });

  sourceRevisions.forEach((revision, index) => {
    const path = `$.sourceRevisions[${index}]`;
    ["id", "documentId", "label"].forEach((key) => requireString(revision, key, path, issues));
    if (isRecord(revision) && isNonEmptyString(revision.documentId) && !documentIds.has(String(revision.documentId))) {
      pushIssue(issues, "error", "MISSING_SOURCE_DOCUMENT", `${path}.documentId`, `Source document does not exist: ${revision.documentId}`);
    }
  });

  concepts.forEach((concept, index) => {
    const path = `$.concepts[${index}]`;
    ["id", "subjectId", "title", "summary"].forEach((key) => requireString(concept, key, path, issues));
    if (isRecord(concept) && isNonEmptyString(concept.subjectId) && !subjectIds.has(String(concept.subjectId))) {
      pushIssue(issues, "error", "MISSING_SUBJECT", `${path}.subjectId`, `Subject does not exist: ${concept.subjectId}`);
    }
    if (!isRecord(concept) || !Array.isArray(concept.categoryIds)) {
      pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.categoryIds`, "categoryIds must be an array.");
    } else {
      concept.categoryIds.forEach((id, idIndex) => {
        if (!categoryIds.has(String(id))) pushIssue(issues, "error", "MISSING_CATEGORY", `${path}.categoryIds[${idIndex}]`, `Category does not exist: ${id}`);
      });
    }
  });

  atomicFacts.forEach((fact, index) => validateFact(fact, index, { conceptIds, documentIds, revisionIds, factIds }, issues));
  validateCompositeGroups(atomicFacts, issues);
  validateDuplicateStatements(atomicFacts, issues);

  questionTemplates.forEach((template, index) => {
    const path = `$.questionTemplates[${index}]`;
    ["id", "questionType", "stemTemplate", "explanationTemplate", "difficulty"].forEach((key) => requireString(template, key, path, issues));
    if (isRecord(template) && isNonEmptyString(template.questionType) && !QUESTION_TYPES.has(String(template.questionType))) {
      pushIssue(issues, "error", "INVALID_QUESTION_TYPE", `${path}.questionType`, `Unsupported questionType: ${template.questionType}`);
    }
  });

  distractorRules.forEach((rule, index) => {
    const path = `$.distractorRules[${index}]`;
    ["id", "mutationType", "description"].forEach((key) => requireString(rule, key, path, issues));
    if (isRecord(rule) && isNonEmptyString(rule.mutationType) && !MUTATION_TYPES.has(String(rule.mutationType))) {
      pushIssue(issues, "error", "INVALID_MUTATION_TYPE", `${path}.mutationType`, `Unsupported mutationType: ${rule.mutationType}`);
    }
  });

  return splitIssues(issues);
}

function validateFact(
  fact: unknown,
  index: number,
  refs: { conceptIds: Set<string>; documentIds: Set<string>; revisionIds: Set<string>; factIds: Set<string> },
  issues: KnowledgePackValidationIssue[]
) {
  const path = `$.atomicFacts[${index}]`;
  ["id", "conceptId", "subject", "predicate", "statement", "version", "status"].forEach((key) => requireString(fact, key, path, issues));

  if (!isRecord(fact)) return;

  if (!refs.conceptIds.has(String(fact.conceptId))) pushIssue(issues, "error", "MISSING_CONCEPT", `${path}.conceptId`, `Concept does not exist: ${fact.conceptId}`);
  if (!FACT_STATUSES.has(String(fact.status))) pushIssue(issues, "error", "INVALID_FACT_STATUS", `${path}.status`, `Unsupported status: ${fact.status}`);
  if (fact.operator && !OPERATORS.has(String(fact.operator))) pushIssue(issues, "error", "INVALID_OPERATOR", `${path}.operator`, `Unsupported operator: ${fact.operator}`);
  if (!Array.isArray(fact.conditions)) pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.conditions`, "conditions must be an array.");
  if (!Array.isArray(fact.exceptions)) pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.exceptions`, "exceptions must be an array.");
  if (!Array.isArray(fact.sourceReferences) || fact.sourceReferences.length === 0) {
    pushIssue(issues, "error", "MISSING_SOURCE_REFERENCE", `${path}.sourceReferences`, "sourceReferences must contain at least one reference.");
  }

  asArray(fact.sourceReferences).forEach((source, sourceIndex) => {
    const sourcePath = `${path}.sourceReferences[${sourceIndex}]`;
    ["documentId", "locator"].forEach((key) => requireString(source, key, sourcePath, issues));
    if (isRecord(source) && isNonEmptyString(source.documentId) && !refs.documentIds.has(String(source.documentId))) {
      pushIssue(issues, "error", "MISSING_SOURCE_DOCUMENT", `${sourcePath}.documentId`, `Source document does not exist: ${source.documentId}`);
    }
    if (isRecord(source) && isNonEmptyString(source.revisionId) && !refs.revisionIds.has(String(source.revisionId))) {
      pushIssue(issues, "error", "MISSING_SOURCE_REVISION", `${sourcePath}.revisionId`, `Source revision does not exist: ${source.revisionId}`);
    }
  });

  for (const [key, code] of [
    ["appliesTo", "MISSING_APPLIES_TO_FACT"],
    ["derivedFrom", "MISSING_DERIVED_FROM_FACT"],
    ["crossReferences", "MISSING_CROSS_REFERENCE_FACT"]
  ] as const) {
    if (fact[key] !== undefined) {
      if (!Array.isArray(fact[key])) {
        pushIssue(issues, "error", "REQUIRED_ARRAY", `${path}.${key}`, `${key} must be an array.`);
      } else {
        fact[key].forEach((id, idIndex) => {
          if (!refs.factIds.has(String(id))) pushIssue(issues, "error", code, `${path}.${key}[${idIndex}]`, `AtomicFact does not exist: ${id}`);
        });
      }
    }
  }

  if (fact.exceptionGroupReference !== undefined && !isNonEmptyString(fact.exceptionGroupReference)) {
    pushIssue(issues, "error", "INVALID_EXCEPTION_GROUP_REFERENCE", `${path}.exceptionGroupReference`, "exceptionGroupReference must be a non-empty string.");
  }
  if (fact.groupId && !fact.groupOperator) pushIssue(issues, "error", "MISSING_GROUP_OPERATOR", `${path}.groupOperator`, "groupOperator is required when groupId exists.");
  if (fact.groupOperator && !fact.groupId) pushIssue(issues, "error", "MISSING_GROUP_ID", `${path}.groupId`, "groupId is required when groupOperator exists.");
  if (fact.factType === "CONDITION_RULE" && (!Array.isArray(fact.appliesTo) || fact.appliesTo.length === 0)) {
    pushIssue(issues, "warning", "CONDITION_RULE_WITHOUT_APPLIES_TO", `${path}.appliesTo`, "CONDITION_RULE should define appliesTo.");
  }
  if (fact.factType === "DERIVED_FACT" && (!Array.isArray(fact.derivedFrom) || fact.derivedFrom.length === 0)) {
    pushIssue(issues, "warning", "DERIVED_FACT_WITHOUT_DERIVED_FROM", `${path}.derivedFrom`, "DERIVED_FACT should define derivedFrom.");
  }
  if (typeof fact.confidence === "number" && (fact.confidence < 0 || fact.confidence > 1)) {
    pushIssue(issues, "error", "INVALID_CONFIDENCE", `${path}.confidence`, "confidence must be between 0 and 1.");
  }
  const effectiveFrom = isNonEmptyString(fact.effectiveFrom) ? String(fact.effectiveFrom) : null;
  const effectiveTo = isNonEmptyString(fact.effectiveTo) ? String(fact.effectiveTo) : null;
  if (effectiveFrom && !isValidDate(effectiveFrom)) pushIssue(issues, "error", "INVALID_EFFECTIVE_FROM", `${path}.effectiveFrom`, "effectiveFrom must be a valid date.");
  if (effectiveTo && !isValidDate(effectiveTo)) pushIssue(issues, "error", "INVALID_EFFECTIVE_TO", `${path}.effectiveTo`, "effectiveTo must be a valid date.");
  if (effectiveFrom && effectiveTo && new Date(effectiveFrom) > new Date(effectiveTo)) {
    pushIssue(issues, "error", "INVALID_EFFECTIVE_RANGE", `${path}.effectiveFrom`, "effectiveFrom must not be later than effectiveTo.");
  }
}

function validateCompositeGroups(atomicFacts: unknown[], issues: KnowledgePackValidationIssue[]) {
  const groups = new Map<string, AtomicFact[]>();
  atomicFacts.filter(isRecord).forEach((fact) => {
    if (fact.factType === "COMPOSITE_FACT" && isNonEmptyString(fact.groupId)) {
      const groupId = String(fact.groupId);
      const list = groups.get(groupId) ?? [];
      list.push(fact as AtomicFact);
      groups.set(groupId, list);
    }
  });

  for (const [groupId, facts] of groups) {
    if (facts.length < 2) {
      pushIssue(issues, "error", "COMPOSITE_GROUP_TOO_SMALL", "$.atomicFacts", `COMPOSITE_FACT group must contain at least 2 facts: ${groupId}`);
    }
    if (facts.some((fact) => !fact.groupOperator)) {
      pushIssue(issues, "error", "MISSING_GROUP_OPERATOR", "$.atomicFacts", `COMPOSITE_FACT groupOperator is required: ${groupId}`);
    }
    if (facts.some((fact) => fact.groupOperator === "OR")) {
      pushIssue(issues, "warning", "OR_GROUP_NOT_GENERATED", "$.atomicFacts", `OR group is validated but not generated yet: ${groupId}`);
    }
  }
}

function validateDuplicateStatements(atomicFacts: unknown[], issues: KnowledgePackValidationIssue[]) {
  const seen = new Set<string>();
  atomicFacts.filter(isRecord).forEach((fact, index) => {
    if (!isNonEmptyString(fact.statement)) return;
    const normalized = String(fact.statement).trim();
    if (seen.has(normalized)) {
      pushIssue(issues, "error", "DUPLICATE_FACT_STATEMENT", `$.atomicFacts[${index}].statement`, "AtomicFact statement is duplicated.");
    }
    seen.add(normalized);
  });
}

function splitIssues(issues: KnowledgePackValidationIssue[]): KnowledgePackValidationResult {
  const errors = issues.filter((item) => item.severity === "error");
  const warnings = issues.filter((item) => item.severity === "warning");
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

export function isKnowledgePack(input: unknown): input is KnowledgePack {
  return validateKnowledgePack(input).valid;
}
