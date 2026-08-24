import type { PreservedNumber } from "./pdf-extraction-quality";

const NUMBER_RE = /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(킬로그램|kg|그램|g|미터|m|만원|원|개월|일|년|시간|대|명|회)?\s*(이상|이하|초과|미만|이내|까지)?/gi;

export function preserveNumbers(text: string, sourceLocator = "PDF:text"): PreservedNumber[] {
  return [...text.matchAll(NUMBER_RE)]
    .map((match, index) => toPreservedNumber(match, index, sourceLocator))
    .filter((item): item is PreservedNumber => Boolean(item));
}

export function numericPreservationRate(beforeText: string, afterText: string) {
  const before = preserveNumbers(beforeText);
  if (!before.length) return 1;
  const afterValues = new Set(preserveNumbers(afterText).map((number) => `${number.value}:${number.unit ?? ""}:${number.operator ?? ""}`));
  const retained = before.filter((number) => afterValues.has(`${number.value}:${number.unit ?? ""}:${number.operator ?? ""}`)).length;
  return retained / before.length;
}

function toPreservedNumber(match: RegExpMatchArray, index: number, sourceLocator: string): PreservedNumber | null {
  const raw = match[0].trim();
  if (!raw || !/\d/.test(raw)) return null;
  const value = Number(match[1]?.replace(/,/g, ""));
  if (!Number.isFinite(value)) return null;
  const unit = normalizeUnit(match[2]);
  const operator = normalizeOperator(match[3]);
  return {
    raw,
    value,
    unit,
    operator,
    normalized: `${value}${unit ?? ""}${operator ? ` ${operatorText(operator)}` : ""}`,
    sourceLocator: `${sourceLocator}:number-${index + 1}`
  };
}

function normalizeUnit(unit?: string) {
  if (!unit) return undefined;
  const lower = unit.toLowerCase();
  if (lower === "킬로그램") return "kg";
  if (lower === "그램") return "g";
  if (lower === "미터") return "m";
  return unit;
}

function normalizeOperator(operator?: string): PreservedNumber["operator"] {
  if (operator === "이상") return "GREATER_EQUAL";
  if (operator === "이하" || operator === "이내" || operator === "까지") return "LESS_EQUAL";
  if (operator === "초과") return "GREATER_THAN";
  if (operator === "미만") return "LESS_THAN";
  return undefined;
}

function operatorText(operator: NonNullable<PreservedNumber["operator"]>) {
  return {
    GREATER_EQUAL: "이상",
    LESS_EQUAL: "이하",
    GREATER_THAN: "초과",
    LESS_THAN: "미만",
    EQUAL: "동일",
    RANGE: "범위"
  }[operator];
}
