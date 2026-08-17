import type { KnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import type { LegalArticle, LegalChapter, LegalClause, LegalDocumentStructure, LegalItem, LegalParagraph } from "./legal-document-structure";

const ARTICLE_RE = /(제\s*\d+\s*조(?:의\s*\d+)?\s*(?:\([^)]+\))?)/g;
const CHAPTER_RE = /(제\s*\d+\s*(?:장|절)\s*[^\n]*)/g;
const PARAGRAPH_RE = /([①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳]|\b\d+\.)/g;
const CLAUSE_RE = /(\b\d+\.\s*|[가-하]\.\s*)/g;
const ITEM_RE = /([가-하]\.\s*|\(\d+\)\s*)/g;

export function parseLegalDocument(source: KnowledgeSourceInput): LegalDocumentStructure {
  const text = normalize(source.content);
  const chapters = parseChapters(source.sourceId, text);
  const articles = parseArticles(source.sourceId, text);
  const paragraphs: LegalParagraph[] = [];
  const clauses: LegalClause[] = [];
  const items: LegalItem[] = [];

  for (const article of articles) {
    const articleParagraphs = parseParagraphs(article);
    paragraphs.push(...articleParagraphs);
    for (const paragraph of articleParagraphs) {
      const paragraphClauses = parseClauses(paragraph);
      clauses.push(...paragraphClauses);
      for (const clause of paragraphClauses) {
        items.push(...parseItems(clause));
      }
    }
  }

  return {
    documentId: source.sourceReference.documentId || source.sourceId,
    title: source.title,
    chapters,
    articles,
    paragraphs,
    clauses,
    items
  };
}

function parseChapters(documentId: string, text: string): LegalChapter[] {
  return [...text.matchAll(CHAPTER_RE)].map((match, index) => ({
    id: `${documentId}:chapter-${index + 1}`,
    text: match[0].trim(),
    sourceLocator: `chapter:${match[0].trim()}`,
    articleIds: []
  }));
}

function parseArticles(documentId: string, text: string): LegalArticle[] {
  const matches = [...text.matchAll(ARTICLE_RE)];
  if (!matches.length) {
    return [{
      id: `${documentId}:article-001`,
      text,
      sourceLocator: "article:unstructured",
      paragraphIds: []
    }];
  }

  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    const articleText = text.slice(start, end).trim();
    const articleId = `${documentId}:article-${String(index + 1).padStart(3, "0")}`;
    return {
      id: articleId,
      text: articleText,
      title: match[0].trim(),
      sourceLocator: `article:${match[0].replace(/\s+/g, "")}`,
      paragraphIds: []
    };
  });
}

function parseParagraphs(article: LegalArticle): LegalParagraph[] {
  const parts = splitByMarker(article.text, PARAGRAPH_RE);
  const effectiveParts = parts.length ? parts : [article.text];
  return effectiveParts.map((text, index) => ({
    id: `${article.id}:paragraph-${index + 1}`,
    articleId: article.id,
    parentId: article.id,
    text,
    sourceLocator: `${article.sourceLocator}:paragraph-${index + 1}`,
    clauseIds: []
  }));
}

function parseClauses(paragraph: LegalParagraph): LegalClause[] {
  const parts = splitByMarker(paragraph.text, CLAUSE_RE);
  const effectiveParts = parts.length > 1 ? parts : [paragraph.text];
  return effectiveParts.map((text, index) => ({
    id: `${paragraph.id}:clause-${index + 1}`,
    paragraphId: paragraph.id,
    parentId: paragraph.id,
    text,
    sourceLocator: `${paragraph.sourceLocator}:clause-${index + 1}`,
    itemIds: []
  }));
}

function parseItems(clause: LegalClause): LegalItem[] {
  return splitByMarker(clause.text, ITEM_RE).slice(1).map((text, index) => ({
    id: `${clause.id}:item-${index + 1}`,
    clauseId: clause.id,
    parentId: clause.id,
    text,
    sourceLocator: `${clause.sourceLocator}:item-${index + 1}`
  }));
}

function splitByMarker(text: string, marker: RegExp) {
  const matches = [...text.matchAll(marker)];
  if (!matches.length) return [];
  return matches
    .map((match, index) => {
      const start = match.index ?? 0;
      const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
      return text.slice(start, end).trim();
    })
    .filter((part) => part.length >= 8);
}

function normalize(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}
