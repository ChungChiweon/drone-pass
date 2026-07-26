export type SourceDocument = {
  id: string;
  title: string;
  publisher: string;
  note: string;
};

export type SourceRevision = {
  id: string;
  documentId: string;
  label: string;
  publishedAt?: string;
};

export type SourceReference = {
  documentId: string;
  revisionId?: string;
  locator: string;
  note?: string;
};

export type Concept = {
  id: string;
  subjectId: string;
  categoryIds: string[];
  title: string;
  summary: string;
};

export type FactCondition = {
  id: string;
  statement: string;
};

export type FactException = {
  id: string;
  statement: string;
};

export type FactStatus = "draft" | "approved" | "expired";

export type AtomicFact = {
  id: string;
  conceptId: string;
  factType?: "SOURCE_FACT" | "CONDITION_RULE" | "COMPOSITE_FACT" | "DERIVED_FACT";
  subject: string;
  predicate: string;
  value: string | number | boolean;
  unit?: string;
  operator?: "eq" | "neq" | "gt" | "gte" | "lt" | "lte";
  statement: string;
  conditions: FactCondition[];
  exceptions: FactException[];
  appliesTo?: string[];
  groupId?: string;
  groupOperator?: "AND" | "OR";
  standaloneQuestionAllowed?: boolean;
  derivedFrom?: string[];
  exceptionGroupReference?: string;
  crossReferences?: string[];
  sourceReferences: SourceReference[];
  sourceVersion?: string;
  confidence?: number;
  reviewNote?: string;
  version: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  status: FactStatus;
};
