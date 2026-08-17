export type LegalNode = {
  id: string;
  text: string;
  sourceLocator: string;
  parentId?: string;
};

export type LegalChapter = LegalNode & {
  articleIds: string[];
};

export type LegalArticle = LegalNode & {
  title?: string;
  chapterId?: string;
  paragraphIds: string[];
};

export type LegalParagraph = LegalNode & {
  articleId: string;
  clauseIds: string[];
};

export type LegalClause = LegalNode & {
  paragraphId: string;
  itemIds: string[];
};

export type LegalItem = LegalNode & {
  clauseId: string;
};

export type LegalDocumentStructure = {
  documentId: string;
  title: string;
  chapters: LegalChapter[];
  articles: LegalArticle[];
  paragraphs: LegalParagraph[];
  clauses: LegalClause[];
  items: LegalItem[];
};

export type FactContext = {
  article: LegalArticle;
  paragraph?: LegalParagraph;
  clause?: LegalClause;
  item?: LegalItem;
  fullArticleText: string;
  parentChapter?: LegalChapter;
  relatedClauses: LegalClause[];
  exceptions: string[];
  conditions: string[];
};

export type LegalConditionExtraction = {
  subject?: string;
  action?: string;
  conditions: string[];
  numbers: string[];
  units: string[];
  periods: string[];
  exceptions: string[];
  threshold?: string;
  applicability?: string;
};

export type LegalExceptionLink = {
  exceptionGroupId: string;
  baseCandidateId: string;
  relatedFactCandidateIds: string[];
  exceptionTexts: string[];
};
