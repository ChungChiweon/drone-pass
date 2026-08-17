import type { FactContext, LegalArticle, LegalDocumentStructure } from "./legal-document-structure";

const EXCEPTION_RE = /(다만|단,|제외|예외|아니하다|아니 된다|불구하고)/;
const CONDITION_RE = /(경우|때|이상|이하|초과|미만|따른|해당|까지|이내|전에|후에|대상|조건)/;

export function buildLegalFactContexts(structure: LegalDocumentStructure): FactContext[] {
  const contexts: FactContext[] = [];
  for (const article of structure.articles) {
    const articleParagraphs = structure.paragraphs.filter((paragraph) => paragraph.articleId === article.id);
    const relatedClauses = structure.clauses.filter((clause) => articleParagraphs.some((paragraph) => paragraph.id === clause.paragraphId));
    const fullArticleText = buildFullArticleText(article);
    const exceptions = extractExceptionTexts(fullArticleText);
    const conditions = extractConditionTexts(fullArticleText);
    if (!relatedClauses.length) {
      contexts.push({ article, fullArticleText, relatedClauses: [], exceptions, conditions });
      continue;
    }
    for (const clause of relatedClauses) {
      const paragraph = articleParagraphs.find((item) => item.id === clause.paragraphId);
      contexts.push({
        article,
        paragraph,
        clause,
        fullArticleText,
        relatedClauses,
        exceptions: extractExceptionTexts(`${clause.text} ${fullArticleText}`).concat(exceptions).filter(unique).slice(0, 5),
        conditions: extractConditionTexts(`${clause.text} ${fullArticleText}`).concat(conditions).filter(unique).slice(0, 7)
      });
    }
  }
  return contexts;
}

function buildFullArticleText(article: LegalArticle) {
  return article.text.replace(/\s+/g, " ").trim();
}

function extractExceptionTexts(text: string) {
  return text
    .split(/(?=다만|단,|제외|예외|아니하다|아니 된다|불구하고)/)
    .map((part) => part.trim())
    .filter((part) => EXCEPTION_RE.test(part))
    .map((part) => part.slice(0, 180))
    .slice(0, 4);
}

function extractConditionTexts(text: string) {
  return text
    .split(/(?=경우|때|이상|이하|초과|미만|따른|해당|까지|이내|전에|후에|대상|조건)/)
    .map((part) => part.trim())
    .filter((part) => CONDITION_RE.test(part))
    .map((part) => part.slice(0, 180))
    .slice(0, 6);
}

function unique(value: string, index: number, values: string[]) {
  return values.indexOf(value) === index;
}
