import type { FactContext, LegalConditionExtraction } from "./legal-document-structure";

const NUMBER_WITH_UNIT_RE = /\d+(?:\.\d+)?\s?(?:킬로그램|kg|그램|g|미터|m|만원|원|개월|일|년|시간|대|명|회)?/g;
const PERIOD_RE = /(개월|일|년|시간)/;
const CONDITION_CUES = ["경우", "때", "이상", "이하", "초과", "미만", "따른", "해당", "까지", "이내", "전에", "후에", "대상", "조건"];
const EXCEPTION_CUES = ["다만", "단,", "제외", "예외", "아니하다", "아니 된다", "불구하고"];

export function extractLegalConditions(context: FactContext): LegalConditionExtraction {
  const text = `${context.clause?.text ?? context.paragraph?.text ?? context.article.text} ${context.fullArticleText}`;
  const numbers = [...new Set([...text.matchAll(NUMBER_WITH_UNIT_RE)].map((match) => match[0].trim()).filter((value) => /\d/.test(value)))];
  const units = [...new Set(numbers.map((number) => number.replace(/[\d.\s]/g, "")).filter(Boolean))];
  const periods = numbers.filter((number) => PERIOD_RE.test(number));
  return {
    subject: extractSubject(text),
    action: extractAction(text),
    conditions: context.conditions.length ? context.conditions : extractByCue(text, CONDITION_CUES),
    numbers,
    units,
    periods,
    exceptions: context.exceptions.length ? context.exceptions : extractByCue(text, EXCEPTION_CUES),
    threshold: numbers[0],
    applicability: extractApplicability(text)
  };
}

function extractSubject(text: string) {
  const subjects = [
    "초경량비행장치 조종자",
    "초경량비행장치소유자등",
    "초경량비행장치 소유자등",
    "무인비행장치 조종자",
    "무인비행장치",
    "무인동력비행장치",
    "국토교통부장관",
    "한국교통안전공단 이사장",
    "항공사업자",
    "사업자"
  ];
  return subjects.find((subject) => text.includes(subject)) ?? subjects.find((subject) => compact(text).includes(compact(subject)));
}

function extractAction(text: string) {
  const actions = [
    "신고하여야 한다",
    "제출하여야 한다",
    "발급하여야 한다",
    "실시하여야 한다",
    "받아야 한다",
    "비행하여서는 아니 된다",
    "하여서는 아니 된다",
    "취소하여야 한다",
    "정지를 명할 수 있다",
    "허가를 받아"
  ];
  return actions.find((action) => text.includes(action)) ?? actions.find((action) => compact(text).includes(compact(action)));
}

function extractApplicability(text: string) {
  const match = text.match(/(항공레저스포츠사업|초경량비행장치사용사업|항공기대여업|무인비행장치|무인동력비행장치|무인비행장치 조종자 증명|안전성인증|조종자 증명)/);
  return match?.[0];
}

function extractByCue(text: string, cues: string[]) {
  return cues
    .filter((cue) => text.includes(cue))
    .map((cue) => {
      const index = text.indexOf(cue);
      return text.slice(Math.max(0, index - 45), Math.min(text.length, index + 110)).trim();
    });
}

function compact(value: string) {
  return value.replace(/\s+/g, "");
}
