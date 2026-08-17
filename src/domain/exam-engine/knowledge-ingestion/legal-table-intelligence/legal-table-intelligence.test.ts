import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import type { CoordinateTextCell } from "./legal-table-structure";
import { extractPdfWithQuality, pdfQualityResultToKnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import {
  analyzeLegalTablesFromPdf,
  detectLegalTables,
  extractCoordinateTableCandidates,
  generateTableComparisonRelations,
  generateTableFactCandidates,
  normalizeCell,
  scoreLegalTableQuality
} from "./index";

const REPORT_PATH = path.join(process.cwd(), "docs", "legal-table-intelligence-report.md");

describe("Legal Table Intelligence Layer", () => {
  it("extracts coordinate-aligned table candidates", () => {
    const candidates = extractCoordinateTableCandidates("virtual.pdf", {
      extractCells: () => coordinateCells()
    });

    expect(candidates.length).toBe(1);
    expect(candidates[0]?.rows.length).toBeGreaterThanOrEqual(3);
    expect(candidates[0]?.confidence).toBeGreaterThan(0.5);
  });

  it("normalizes cells, maps rows, and creates table FactCandidates", () => {
    const source = sourceInput();
    const tables = detectLegalTables({
      coordinateCandidates: extractCoordinateTableCandidates("virtual.pdf", { extractCells: () => coordinateCells() }),
      sourceId: source.sourceId,
      text: source.content
    });
    const facts = generateTableFactCandidates(source, tables);
    const quality = scoreLegalTableQuality(tables[0]!);

    expect(normalizeCell("3 억 원")).toBe("3억원");
    expect(tables[0]?.tableType).toBe("REQUIREMENT_TABLE");
    expect(facts.some((candidate) => candidate.statement.includes("개인사업자"))).toBe(true);
    expect(facts.some((candidate) => candidate.extractedNumbers.length > 0 || candidate.statement.includes("억원"))).toBe(true);
    expect(quality.overallScore).toBeGreaterThan(0.7);
  });

  it("generates comparison graph candidates without approving or storing relations", () => {
    const source = sourceInput();
    const tables = detectLegalTables({
      coordinateCandidates: extractCoordinateTableCandidates("virtual.pdf", { extractCells: () => coordinateCells() }),
      sourceId: source.sourceId,
      text: source.content
    });
    const facts = generateTableFactCandidates(source, tables);
    const relations = generateTableComparisonRelations(source, facts);

    expect(relations.length).toBeGreaterThan(0);
    expect(relations.every((relation) => relation.reviewStatus === "draft")).toBe(true);
    expect(relations.some((relation) => relation.relationType === "COMPARISON_PAIR" || relation.relationType === "CONFUSED_WITH")).toBe(true);
  });

  it("runs the real aviation safety PDF through table intelligence and writes the report", () => {
    const pdfPath = findAviationSafetyPdf();
    const qualityResult = extractPdfWithQuality(pdfPath, {
      sourceId: "pdf-aviation-safety-act",
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "table-intelligence-v1",
      maxPages: 20,
      maxCharacters: 24000
    });
    const source = pdfQualityResultToKnowledgeSourceInput(pdfPath, qualityResult, {
      sourceType: "LAW",
      title: "항공안전법 PDF",
      version: "table-intelligence-v1"
    });
    const result = analyzeLegalTablesFromPdf(pdfPath, source, { qualityResult, maxPages: 20 });

    expect(result.tables.length).toBeGreaterThanOrEqual(qualityResult.tables.length);
    expect(result.factCandidates.every((candidate) => candidate.status === "draft")).toBe(true);
    expect(result.relationCandidates.every((relation) => relation.reviewStatus === "draft")).toBe(true);

    fs.writeFileSync(REPORT_PATH, renderReport({
      pdfPath,
      beforeTables: qualityResult.tables.length,
      result
    }), "utf8");
    expect(fs.existsSync(REPORT_PATH)).toBe(true);
  }, 150000);
});

function coordinateCells(): CoordinateTextCell[] {
  const rows = [
    ["사업종류", "법인", "개인"],
    ["항공레저스포츠사업 가목", "3 억 원", "4 억 5천만원"],
    ["항공기대여업", "2 억 5천만원", "3 억 7천500만원"]
  ];
  return rows.flatMap((row, rowIndex) => row.map((text, columnIndex) => ({
    text,
    x0: 50 + columnIndex * 150,
    x1: 130 + columnIndex * 150,
    top: 100 + rowIndex * 18,
    bottom: 114 + rowIndex * 18,
    pageNumber: 1
  })));
}

function sourceInput() {
  return {
    sourceId: "table-source",
    sourceType: "LAW" as const,
    title: "항공사업법 시행령 별표",
    version: "test",
    content: "별표 등록요건표\n사업종류  법인  개인\n항공레저스포츠사업 가목  3억원  4억5천만원",
    sourceReference: {
      documentId: "aviation-business-enforcement-decree",
      locator: "별표:등록요건"
    }
  };
}

function findAviationSafetyPdf() {
  const docsPath = path.join(process.cwd(), "docs");
  const pdfName = fs.readdirSync(docsPath).find((name) => name.includes("항공안전법") && name.endsWith(".pdf"));
  if (!pdfName) throw new Error("항공안전법 PDF를 docs 폴더에서 찾지 못했습니다.");
  return path.join(docsPath, pdfName);
}

function renderReport(input: {
  pdfPath: string;
  beforeTables: number;
  result: ReturnType<typeof analyzeLegalTablesFromPdf>;
}) {
  const relationSummary = countBy(input.result.relationCandidates.map((relation) => relation.relationType));
  return [
    "# Legal Table Intelligence Report",
    "",
    "## Table Extraction 방식",
    "",
    "- Coordinate Table Extractor는 pdfplumber word 좌표(x0/x1/top/bottom)를 읽어 y축 row grouping, x축 column clustering을 수행한다.",
    "- Legal Table Detector는 좌표 후보, PDF quality layer의 text table 후보, 정규화 텍스트의 반복 column 패턴을 합쳐 LegalTableStructure로 변환한다.",
    "- Table Normalizer는 숫자/단위 공백, 억 원/만 원 분리, 이상/이하 분리를 복원한다.",
    "- 이번 단계는 분석/후보 생성만 수행하며 AtomicFact, Graph, Question 저장은 하지 않는다.",
    "",
    "## 탐지 결과",
    "",
    `- Before extracted tables: ${input.beforeTables}`,
    `- After detected legal tables: ${input.result.tables.length}`,
    `- Generated table FactCandidates: ${input.result.factCandidates.length}`,
    `- Generated table relation candidates: ${input.result.relationCandidates.length}`,
    "",
    "## Table Quality",
    "",
    table(["Table", "Type", "Rows", "Columns", "Overall", "Header", "Row", "Numeric"], input.result.tables.map((item) => {
      const score = input.result.tableQualityScores.find((entry) => entry.tableId === item.tableId);
      return [
        item.tableId,
        item.tableType,
        String(item.rows.length),
        String(item.columns.length),
        score?.overallScore.toFixed(3) ?? "-",
        score?.headerConfidence.toFixed(3) ?? "-",
        score?.rowConsistency.toFixed(3) ?? "-",
        score?.numericPreservation.toFixed(3) ?? "-"
      ];
    })),
    "",
    "## 생성 Fact 후보",
    "",
    table(["Candidate", "Statement", "Table", "Column", "Value", "Locator"], input.result.factCandidates.slice(0, 30).map((candidate) => [
      candidate.candidateId,
      candidate.statement.slice(0, 140),
      candidate.tableMetadata.tableId,
      candidate.tableMetadata.column,
      candidate.tableMetadata.value,
      candidate.tableMetadata.sourceLocator
    ])),
    "",
    "## Graph 영향 Simulation",
    "",
    `- COMPARISON_PAIR candidates: ${relationSummary.COMPARISON_PAIR ?? 0}`,
    `- CONFUSED_WITH candidates: ${relationSummary.CONFUSED_WITH ?? 0}`,
    `- Expected distractor increase: ${input.result.relationCandidates.length}`,
    "- All graph candidates are draft simulation objects only. No relation was approved or saved.",
    "",
    "## Question 영향 Simulation",
    "",
    `- Possible table-based questions: ${input.result.questionYield.possibleQuestions}`,
    `- Comparison questions: ${input.result.questionYield.comparisonQuestions}`,
    `- CASE_JUDGMENT-like questions: ${input.result.questionYield.caseJudgmentQuestions}`,
    "",
    "## 남은 문제",
    "",
    "- PDF 원본이 좌표상 표 column을 충분히 분리하지 않으면 table count가 낮게 유지될 수 있다.",
    "- 복잡한 별표 다단 표는 cell merge/header spanning 처리가 추가로 필요하다.",
    "- 실제 Graph 연결은 아직 승인/저장하지 않았고, 사람이 검수할 후보만 생성한다.",
    "",
    "## Data Safety",
    "",
    "- AtomicFact 생성/수정: 수행하지 않음.",
    "- Fact status 변경: 수행하지 않음.",
    "- KnowledgePack 변경: 수행하지 않음.",
    "- Graph 승인/Graph Version 변경: 수행하지 않음.",
    "- Question DB 저장: 수행하지 않음.",
    "- Supabase 변경: 수행하지 않음."
  ].join("\n") + "\n";
}

function table(headers: string[], rows: string[][]) {
  if (!rows.length) return "_None._";
  return [
    `| ${headers.join(" | ")} |`,
    `| ${headers.map(() => "---").join(" | ")} |`,
    ...rows.map((row) => `| ${row.map((value) => value.replaceAll("|", "\\|")).join(" | ")} |`)
  ].join("\n");
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((acc, value) => {
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}
