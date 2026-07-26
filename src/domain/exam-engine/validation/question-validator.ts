import type { GeneratedQuestion, ValidationIssue, ValidationResult } from "@/domain/exam-engine/types";

function issue(code: string, message: string, severity: ValidationIssue["severity"] = "error"): ValidationIssue {
  return { code, message, severity };
}

export function validateGeneratedQuestion(question: GeneratedQuestion): ValidationResult {
  const issues: ValidationIssue[] = [];
  const unresolvedPlaceholderPattern = /{[a-zA-Z]+}/;
  const normalizedTexts = question.choices.map((choice) => choice.text.trim());
  const choiceIds = new Set(question.choices.map((choice) => choice.id));
  const choiceTexts = new Set(normalizedTexts);
  const correctChoices = question.choices.filter((choice) => choice.isCorrect);

  if (question.choices.length !== 4) {
    issues.push(issue("CHOICE_COUNT", "선택지는 정확히 4개여야 합니다."));
  }

  if (correctChoices.length !== 1) {
    issues.push(issue("CORRECT_CHOICE_COUNT", "정답 선택지는 정확히 1개여야 합니다."));
  }

  if (choiceIds.size !== question.choices.length) {
    issues.push(issue("DUPLICATE_CHOICE_ID", "보기 ID가 중복되었습니다."));
  }

  if (choiceTexts.size !== question.choices.length) {
    issues.push(issue("DUPLICATE_CHOICE_TEXT", "보기 문장이 중복되었습니다."));
  }

  if (question.choices.some((choice) => choice.sourceFactIds.length === 0)) {
    issues.push(issue("MISSING_CHOICE_SOURCE_FACT", "모든 보기는 하나 이상의 사실과 연결되어야 합니다."));
  }

  if (question.sourceReferences.length === 0) {
    issues.push(issue("MISSING_SOURCE_REFERENCE", "출처 참조가 필요합니다."));
  }

  if (!question.generatedAt || Number.isNaN(Date.parse(question.generatedAt))) {
    issues.push(issue("INVALID_GENERATED_AT", "생성 시간이 유효하지 않습니다."));
  }

  if (!question.generationSeed || question.trace.distractorRuleIds.length === 0) {
    issues.push(issue("MISSING_TRACE", "생성 seed와 trace가 필요합니다."));
  }

  if (correctChoices[0] && question.choices.some((choice) => !choice.isCorrect && choice.text.trim() === correctChoices[0].text.trim())) {
    issues.push(issue("CORRECT_DISTRACTOR_COLLISION", "정답과 오답 문장이 동일합니다."));
  }

  if (question.trace.questionType === "SELECT_FALSE" && correctChoices[0] && !correctChoices[0].mutationType) {
    issues.push(issue("SELECT_FALSE_REQUIRES_MUTATION", "옳지 않은 것을 고르는 문제의 정답 보기는 변형 규칙을 가져야 합니다."));
  }

  if (question.choices.some((choice) => /\d/.test(choice.text) && !/[가-힣a-zA-Z%/]/.test(choice.text))) {
    issues.push(issue("NUMERIC_UNIT_MISSING", "숫자 기준이 있는 보기에는 단위나 판단 기준이 필요합니다."));
  }

  if (unresolvedPlaceholderPattern.test(question.stem) || unresolvedPlaceholderPattern.test(question.explanation)) {
    issues.push(issue("UNRESOLVED_PLACEHOLDER", "Question stem or explanation contains an unresolved placeholder."));
  }

  return {
    ok: issues.every((item) => item.severity !== "error"),
    issues
  };
}
