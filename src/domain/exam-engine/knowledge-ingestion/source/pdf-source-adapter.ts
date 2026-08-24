import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { KnowledgeSourceInput, KnowledgeSourceType } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";

export type PdfSourceAdapterOptions = {
  sourceId?: string;
  sourceType?: KnowledgeSourceType;
  title?: string;
  version?: string;
  documentId?: string;
  revisionId?: string;
  locator?: string;
  maxPages?: number;
  maxCharacters?: number;
  extractText?: (pdfPath: string) => string;
};

export function pdfToKnowledgeSourceInput(pdfPath: string, options: PdfSourceAdapterOptions = {}): KnowledgeSourceInput {
  const absolutePath = path.resolve(pdfPath);
  const fileName = path.basename(absolutePath);
  const content = limitText(normalizeText(options.extractText ? options.extractText(absolutePath) : extractPdfText(absolutePath, { maxPages: options.maxPages })), options.maxCharacters);
  const sourceId = options.sourceId ?? sourceIdFromFileName(fileName);

  return {
    sourceId,
    sourceType: options.sourceType ?? inferSourceType(fileName, content),
    title: options.title ?? titleFromFileName(fileName),
    version: options.version ?? "pdf-source-v1",
    content,
    sourceReference: {
      documentId: options.documentId ?? sourceId,
      revisionId: options.revisionId,
      locator: options.locator ?? `PDF:${fileName}`
    }
  };
}

export function extractPdfText(pdfPath: string, options: Pick<PdfSourceAdapterOptions, "maxPages"> = {}): string {
  if (!fs.existsSync(pdfPath)) throw new Error(`PDF not found: ${pdfPath}`);
  const pythonResult = extractWithPython(pdfPath, options.maxPages);
  if (pythonResult.trim()) return pythonResult;
  return extractWithBinaryFallback(pdfPath);
}

function extractWithPython(pdfPath: string, maxPages?: number) {
  const script = [
    "import sys",
    "path=sys.argv[1]",
    "text=''",
    "try:",
    "    import pdfplumber",
    "    with pdfplumber.open(path) as pdf:",
    "        pages=pdf.pages[:max_pages] if max_pages else pdf.pages",
    "        text='\\n'.join((page.extract_text() or '') for page in pages)",
    "except Exception:",
    "    try:",
    "        from pypdf import PdfReader",
    "        reader=PdfReader(path)",
    "        pages=reader.pages[:max_pages] if max_pages else reader.pages",
    "        text='\\n'.join((page.extract_text() or '') for page in pages)",
    "    except Exception:",
    "        text=''",
    "sys.stdout.write(text)"
  ].join("\n");
  const result = spawnSync("python", ["-c", `max_pages=${maxPages ?? 0}\n${script}`, pdfPath], {
    encoding: "utf8",
    maxBuffer: 20 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" }
  });
  return result.status === 0 ? result.stdout : "";
}

function extractWithBinaryFallback(pdfPath: string) {
  return fs.readFileSync(pdfPath)
    .toString("latin1")
    .replace(/[^\x09\x0A\x0D\x20-\x7E가-힣]/g, " ")
    .replace(/\s+/g, " ");
}

function normalizeText(value: string) {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
}

function limitText(value: string, maxCharacters?: number) {
  if (!maxCharacters || value.length <= maxCharacters) return value;
  return value.slice(0, maxCharacters);
}

function sourceIdFromFileName(fileName: string) {
  return `pdf-${fileName.toLowerCase().replace(/\.[^.]+$/, "").replace(/[^\p{L}\p{N}]+/gu, "-").replace(/^-|-$/g, "")}`;
}

function titleFromFileName(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "");
}

function inferSourceType(fileName: string, content: string): KnowledgeSourceType {
  const text = `${fileName} ${content.slice(0, 300)}`;
  if (/법|시행령|시행규칙|law|act|regulation/i.test(text)) return "LAW";
  if (/시험|문제|exam/i.test(text)) return "EXAM";
  if (/교육|교재|안내|textbook/i.test(text)) return "TEXTBOOK";
  return "OTHER";
}
