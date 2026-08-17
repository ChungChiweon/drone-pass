import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { CoordinateTextCell, TableCandidate } from "./legal-table-structure";

export type CoordinateTableExtractionOptions = {
  maxPages?: number;
  extractCells?: (pdfPath: string) => CoordinateTextCell[];
};

export function extractCoordinateTableCandidates(pdfPath: string, options: CoordinateTableExtractionOptions = {}): TableCandidate[] {
  const absolutePath = path.resolve(pdfPath);
  if (!options.extractCells && !fs.existsSync(absolutePath)) throw new Error(`PDF not found: ${absolutePath}`);
  const cells = options.extractCells ? options.extractCells(absolutePath) : extractCellsWithPdfplumber(absolutePath, options.maxPages);
  const pageGroups = groupBy(cells.filter((cell) => cell.text.trim()), (cell) => String(cell.pageNumber));
  return Object.entries(pageGroups).flatMap(([pageNumber, pageCells]) => buildCandidatesForPage(Number(pageNumber), pageCells));
}

function extractCellsWithPdfplumber(pdfPath: string, maxPages?: number): CoordinateTextCell[] {
  const script = [
    "import json, sys",
    "path=sys.argv[1]",
    `max_pages=${maxPages ?? 0}`,
    "out=[]",
    "try:",
    "    import pdfplumber",
    "    with pdfplumber.open(path) as pdf:",
    "        pages=pdf.pages[:max_pages] if max_pages else pdf.pages",
    "        for page_index, page in enumerate(pages, start=1):",
    "            for word in page.extract_words(x_tolerance=2, y_tolerance=3, keep_blank_chars=False) or []:",
    "                out.append({",
    "                    'text': word.get('text', ''),",
    "                    'x0': float(word.get('x0', 0)),",
    "                    'x1': float(word.get('x1', 0)),",
    "                    'top': float(word.get('top', 0)),",
    "                    'bottom': float(word.get('bottom', 0)),",
    "                    'pageNumber': page_index",
    "                })",
    "except Exception:",
    "    out=[]",
    "sys.stdout.write(json.dumps(out, ensure_ascii=False))"
  ].join("\n");
  const result = spawnSync("python", ["-c", script, pdfPath], {
    encoding: "utf8",
    maxBuffer: 40 * 1024 * 1024,
    env: { ...process.env, PYTHONIOENCODING: "utf-8" }
  });
  if (result.status !== 0 || !result.stdout.trim()) return [];
  try {
    return JSON.parse(result.stdout) as CoordinateTextCell[];
  } catch {
    return [];
  }
}

function buildCandidatesForPage(pageNumber: number, cells: CoordinateTextCell[]): TableCandidate[] {
  const rows = groupRows(cells);
  const tableLikeRows = rows.filter((row) => row.length >= 3 || hasLegalTableCue(row.map((cell) => cell.text).join(" ")));
  if (tableLikeRows.length < 2) return [];
  const rowTexts = tableLikeRows.map((row) => clusterColumns(row).map((cluster) => cluster.map((cell) => cell.text).join(" ").trim()).filter(Boolean));
  const usefulRows = rowTexts.filter((row) => row.length >= 2);
  if (usefulRows.length < 2) return [];
  return [{
    tableId: `coord-table-p${pageNumber}-1`,
    pageNumber,
    sourceLocator: `PDF:page-${pageNumber}:coordinate-table-1`,
    title: inferTitle(cells, tableLikeRows[0]?.[0]?.top ?? 0),
    cells: tableLikeRows.flat(),
    rows: usefulRows,
    confidence: scoreCandidate(usefulRows)
  }];
}

function groupRows(cells: CoordinateTextCell[]) {
  const sorted = [...cells].sort((left, right) => left.top - right.top || left.x0 - right.x0);
  const rows: CoordinateTextCell[][] = [];
  for (const cell of sorted) {
    const row = rows.find((items) => Math.abs(average(items.map((item) => item.top)) - cell.top) <= 4);
    if (row) row.push(cell);
    else rows.push([cell]);
  }
  return rows.map((row) => row.sort((left, right) => left.x0 - right.x0));
}

function clusterColumns(row: CoordinateTextCell[]) {
  const clusters: CoordinateTextCell[][] = [];
  for (const cell of row) {
    const previous = clusters.at(-1);
    if (previous && cell.x0 - Math.max(...previous.map((item) => item.x1)) <= 18) previous.push(cell);
    else clusters.push([cell]);
  }
  return clusters;
}

function inferTitle(cells: CoordinateTextCell[], firstTableTop: number) {
  const titleLine = cells
    .filter((cell) => cell.top < firstTableTop && firstTableTop - cell.top < 80)
    .sort((left, right) => left.top - right.top || left.x0 - right.x0)
    .map((cell) => cell.text)
    .join(" ")
    .match(/(별표\s*\d*|별지\s*\d*|.+(?:기준|요건|표))/)?.[0];
  return titleLine?.trim();
}

function hasLegalTableCue(text: string) {
  return /(법인|개인|구분|기준|요건|자본금|자산평가액|벌금|과태료|사업|종류|이상|이하|만원|억원)/.test(text);
}

function scoreCandidate(rows: string[][]) {
  const widths = rows.map((row) => row.length);
  const consistency = 1 - (Math.max(...widths) - Math.min(...widths)) / Math.max(...widths);
  const numeric = rows.flat().some((cell) => /\d|억|만원|kg|년|월|일/.test(cell)) ? 0.25 : 0;
  const cue = rows.flat().some(hasLegalTableCue) ? 0.25 : 0;
  return Math.round(Math.max(0.2, Math.min(1, consistency * 0.5 + numeric + cue)) * 1000) / 1000;
}

function groupBy<T>(items: T[], key: (item: T) => string) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    const groupKey = key(item);
    acc[groupKey] = acc[groupKey] ?? [];
    acc[groupKey].push(item);
    return acc;
  }, {});
}

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}
