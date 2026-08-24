import type { KnowledgeSourceInput } from "@/domain/exam-engine/knowledge-ingestion/knowledge-ingestion";
import { preserveNumbers } from "@/domain/exam-engine/knowledge-ingestion/pdf-quality";
import type { LegalTableStructure, TableFactCandidate } from "./legal-table-structure";

export function generateTableFactCandidates(source: KnowledgeSourceInput, tables: LegalTableStructure[]): TableFactCandidate[] {
  return tables.flatMap((table) => table.rows.flatMap((row, rowIndex) =>
    row.values.flatMap((value, columnIndex) => {
      const column = table.columns[columnIndex]?.name ?? table.headers[columnIndex] ?? `column-${columnIndex + 1}`;
      if (!isFactBearingCell(value, column)) return [];
      const rowLabel = inferRowLabel(table, row.values);
      const statement = buildStatement(table, rowLabel, column, value);
      const numbers = preserveNumbers(value, `${table.sourceLocator}:${row.rowId}:${column}`);
      const sourceLocator = `${table.sourceLocator}:${row.rowId}:col-${columnIndex + 1}`;
      return [{
        candidateId: `${source.sourceId}:table-candidate-${table.tableId.replace(/[^\p{L}\p{N}]+/gu, "-")}-${rowIndex + 1}-${columnIndex + 1}`,
        sourceId: source.sourceId,
        statement,
        conceptHint: inferConceptHint(table, statement),
        categoryHint: inferCategoryHint(table),
        extractedNumbers: numbers.map((number) => number.raw),
        extractedConditions: [rowLabel, column].filter(Boolean),
        extractedExceptions: table.tableType === "EXCEPTION_TABLE" ? [row.sourceText] : [],
        confidence: scoreCandidate(table, value, numbers.length),
        sourceReference: {
          ...source.sourceReference,
          locator: sourceLocator
        },
        status: "draft",
        legalSubject: rowLabel,
        legalAction: inferLegalAction(table),
        condition: column,
        threshold: numbers[0]?.normalized ?? value,
        applicability: table.title ?? table.category,
        tableMetadata: {
          tableId: table.tableId,
          rowId: row.rowId,
          column,
          value,
          unit: numbers[0]?.unit,
          sourceLocator
        }
      }];
    })
  ));
}

function isFactBearingCell(value: string, column: string) {
  if (!value.trim()) return false;
  if (/^(구분|사업종류|종류|대상)$/.test(column)) return false;
  return /\d|억|만원|kg|원|년|개월|이상|이하|초과|미만|허가|신고|승인|취소|정지|벌금|과태료/.test(value);
}

function inferRowLabel(table: LegalTableStructure, values: string[]) {
  const labelIndex = table.headers.findIndex((header) => /(구분|사업|종류|대상|항목|기준)/.test(header));
  return values[Math.max(0, labelIndex)] || values[0] || table.title || table.category;
}

function buildStatement(table: LegalTableStructure, rowLabel: string, column: string, value: string) {
  if (table.tableType === "REQUIREMENT_TABLE") {
    const actor = /개인/.test(column) ? `${rowLabel} 개인사업자` : /법인/.test(column) ? `${rowLabel} 법인사업자` : rowLabel;
    const basis = /개인/.test(column) ? "자산평가액" : /법인/.test(column) ? "자본금" : column;
    return `${actor}는 ${basis} ${value} 이상 기준을 충족해야 한다.`;
  }
  if (table.tableType === "PENALTY_TABLE") return `${rowLabel}에 대해서는 ${column} 기준 ${value}가 적용될 수 있다.`;
  if (table.tableType === "CLASSIFICATION_TABLE") return `${rowLabel}의 ${column} 기준은 ${value}이다.`;
  if (table.tableType === "EXCEPTION_TABLE") return `${rowLabel}는 ${column} 기준에서 ${value} 예외 또는 제외 조건을 가진다.`;
  return `${rowLabel}의 ${column} 기준값은 ${value}이다.`;
}

function inferLegalAction(table: LegalTableStructure) {
  if (table.tableType === "REQUIREMENT_TABLE") return "기준을 충족해야 한다";
  if (table.tableType === "PENALTY_TABLE") return "처벌 또는 행정처분 기준이 적용된다";
  if (table.tableType === "EXCEPTION_TABLE") return "예외 또는 제외 조건이 적용된다";
  return "표의 기준을 적용받는다";
}

function inferConceptHint(table: LegalTableStructure, statement: string) {
  if (table.tableType === "REQUIREMENT_TABLE") return "concept:business-requirement";
  if (table.tableType === "PENALTY_TABLE") return "concept:penalty";
  if (statement.includes("신고")) return "concept:report";
  if (statement.includes("승인") || statement.includes("허가")) return "concept:approval";
  return "concept:table-standard";
}

function inferCategoryHint(table: LegalTableStructure) {
  if (table.tableType === "REQUIREMENT_TABLE") return "cat-business-requirement";
  if (table.tableType === "PENALTY_TABLE") return "cat-penalty-core";
  if (table.tableType === "EXCEPTION_TABLE") return "cat-exception";
  return "cat-table-standard";
}

function scoreCandidate(table: LegalTableStructure, value: string, numericCount: number) {
  let score = 0.5;
  if (table.headers.length >= 2) score += 0.12;
  if (table.sourceLocator) score += 0.12;
  if (numericCount > 0) score += 0.14;
  if (/(억|만원|kg|년|개월|이상|이하)/.test(value)) score += 0.08;
  if (table.tableType !== "OTHER") score += 0.04;
  return Math.min(0.95, Math.round(score * 1000) / 1000);
}
