import path from "node:path";
import type { KnowledgeSourceInput, KnowledgeSourceType } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { extractPdfText } from "@/domain/exam-engine/knowledge-ingestion/source/pdf-source-adapter";
import type { ExtractionWarning, PdfExtractionResult, PdfPageText, PdfSection } from "./pdf-extraction-quality";
import { detectEncodingQuality, encodingWarnings } from "./encoding-quality-detector";
import { parseLegalTables } from "./legal-table-parser";
import { numericPreservationRate, preserveNumbers } from "./numeric-preservation";
import { extractPdfTables } from "./pdf-table-extractor";
import { normalizePdfText } from "./pdf-text-normalizer";
import { qualityWarnings, scorePdfExtractionQuality } from "./pdf-quality-scorer";

export type PdfQualityExtractionOptions = {
  sourceId?: string;
  sourceType?: KnowledgeSourceType;
  title?: string;
  version?: string;
  maxPages?: number;
  maxCharacters?: number;
  extractText?: (pdfPath: string) => string;
};

export function extractPdfWithQuality(pdfPath: string, options: PdfQualityExtractionOptions = {}): PdfExtractionResult {
  const absolutePath = path.resolve(pdfPath);
  const sourceId = options.sourceId ?? sourceIdFromFileName(path.basename(absolutePath));
  const extractedText = limitText(options.extractText ? options.extractText(absolutePath) : extractPdfText(absolutePath, { maxPages: options.maxPages }), options.maxCharacters);
  const normalizedText = normalizePdfText(extractedText);
  const pages = splitPages(extractedText, normalizedText);
  const encoding = detectEncodingQuality(pages);
  const tables = extractPdfTables(normalizedText, sourceId);
  const sections = extractSections(normalizedText, sourceId);
  const preservedNumbers = preserveNumbers(normalizedText, `PDF:${path.basename(absolutePath)}`);
  const legalTableCandidates = parseLegalTables(tables);
  const extractionQualityScore = scorePdfExtractionQuality({ encoding, sections, tables, preservedNumbers, extractedText, normalizedText });
  const warnings = [
    ...encodingWarnings(encoding),
    ...qualityWarnings(extractionQualityScore),
    ...numberLossWarnings(extractedText, normalizedText)
  ];

  return {
    sourceId,
    pages,
    extractedText,
    normalizedText,
    tables,
    sections,
    preservedNumbers,
    legalTableCandidates,
    extractionQualityScore,
    warnings
  };
}

export function pdfQualityResultToKnowledgeSourceInput(
  pdfPath: string,
  result: PdfExtractionResult,
  options: Pick<PdfQualityExtractionOptions, "sourceType" | "title" | "version"> = {}
): KnowledgeSourceInput {
  const fileName = path.basename(path.resolve(pdfPath));
  return {
    sourceId: result.sourceId,
    sourceType: options.sourceType ?? "LAW",
    title: options.title ?? fileName.replace(/\.[^.]+$/, ""),
    version: options.version ?? "pdf-quality-v1",
    content: result.normalizedText,
    sourceReference: {
      documentId: result.sourceId,
      locator: `PDF:${fileName}:quality-normalized`
    }
  };
}

function splitPages(extractedText: string, normalizedText: string): PdfPageText[] {
  const rawPages = extractedText.includes("\f") ? extractedText.split("\f") : [extractedText];
  const normalizedPages = normalizedText.includes("\f") ? normalizedText.split("\f") : [normalizedText];
  return rawPages.map((text, index) => ({
    pageNumber: index + 1,
    text,
    normalizedText: normalizedPages[index] ?? normalizePdfText(text)
  }));
}

function extractSections(text: string, sourceId: string): PdfSection[] {
  const matches = [...text.matchAll(/(제\s*\d+\s*(?:장|절|조)(?:의\s*\d+)?\s*(?:\([^)]+\))?|별표\s*\d*|별지\s*\d*|부칙)/g)];
  return matches.map((match, index) => {
    const start = match.index ?? 0;
    const end = index + 1 < matches.length ? matches[index + 1].index ?? text.length : text.length;
    const title = match[0].trim();
    return {
      sectionId: `${sourceId}:section-${index + 1}`,
      title,
      sourceLocator: `section:${title.replace(/\s+/g, "")}`,
      text: text.slice(start, end).trim()
    };
  });
}

function numberLossWarnings(extractedText: string, normalizedText: string): ExtractionWarning[] {
  const rate = numericPreservationRate(extractedText, normalizedText);
  if (rate >= 0.9) return [];
  return [{ type: "NUMBER_LOSS", severity: "HIGH", message: `Numeric preservation rate is ${(rate * 100).toFixed(1)}%.` }];
}

function limitText(value: string, maxCharacters?: number) {
  if (!maxCharacters || value.length <= maxCharacters) return value;
  return value.slice(0, maxCharacters);
}

function sourceIdFromFileName(fileName: string) {
  return `pdf-${fileName.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}`;
}
