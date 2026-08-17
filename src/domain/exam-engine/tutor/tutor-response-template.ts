import type { ErrorDiagnosis } from "./error-diagnosis";
import type { ExplanationStrategy, TutorResponseContext, TutorResponseTemplate } from "./tutor-response";

export function selectExplanationStrategy(errorDiagnosis: ErrorDiagnosis): ExplanationStrategy {
  if (errorDiagnosis.errorType === "KNOWLEDGE_GAP") return "CONCEPT_REVIEW";
  if (errorDiagnosis.errorType === "CONCEPT_CONFUSION") return "CONFUSION_CLARIFICATION";
  if (errorDiagnosis.errorType === "NUMERIC_MISTAKE") return "NUMERIC_EXPLANATION";
  if (errorDiagnosis.errorType === "EXCEPTION_MISSED") return "EXCEPTION_EXPLANATION";
  return "QUICK_REMINDER";
}

export function buildTutorResponseTemplate(
  context: TutorResponseContext,
  strategy: ExplanationStrategy = selectExplanationStrategy(context.errorDiagnosis)
): TutorResponseTemplate {
  return {
    title: titleFor(strategy),
    summary: summaryFor(context, strategy),
    keyPoints: keyPointsFor(context, strategy),
    relatedFacts: uniqueIds([...context.relatedFacts, ...context.explanationFacts]),
    nextAction: nextActionFor(context, strategy)
  };
}

function titleFor(strategy: ExplanationStrategy) {
  if (strategy === "CONCEPT_REVIEW") return "개념을 한 번 더 잡고 갑시다";
  if (strategy === "CONFUSION_CLARIFICATION") return "헷갈린 개념을 분리해 봅시다";
  if (strategy === "NUMERIC_EXPLANATION") return "숫자와 단위를 다시 확인합시다";
  if (strategy === "EXCEPTION_EXPLANATION") return "예외 조건을 놓쳤는지 확인합시다";
  return "빠르게 다시 점검합시다";
}

function summaryFor(context: TutorResponseContext, strategy: ExplanationStrategy) {
  const factId = context.errorDiagnosis.factId;
  if (strategy === "CONCEPT_REVIEW") return `${factId}의 기본 개념 숙련도가 낮아 보입니다. 핵심 정의와 적용 조건을 먼저 복습하세요.`;
  if (strategy === "CONFUSION_CLARIFICATION") return `${factId}와 혼동 가능한 fact를 함께 비교해야 합니다. 서로 다른 조건과 결론을 분리하세요.`;
  if (strategy === "NUMERIC_EXPLANATION") return `${factId}에서 숫자, 기간, 중량, 단위 중 하나를 잘못 판단했을 가능성이 큽니다.`;
  if (strategy === "EXCEPTION_EXPLANATION") return `${factId}의 예외 또는 단서 조건을 빠뜨렸을 가능성이 있습니다.`;
  return `${factId}의 핵심은 알고 있지만 선택 과정에서 실수가 있었을 수 있습니다.`;
}

function keyPointsFor(context: TutorResponseContext, strategy: ExplanationStrategy) {
  const diagnosis = context.errorDiagnosis;
  const base = [`오류 유형: ${diagnosis.errorType}`, `판단 근거: ${diagnosis.errorReason}`];
  if (strategy === "CONFUSION_CLARIFICATION") return [...base, `혼동 Fact: ${fallbackList(diagnosis.confusionFacts)}`, `비교할 Fact: ${fallbackList(context.relatedFacts)}`];
  if (strategy === "NUMERIC_EXPLANATION") return [...base, "숫자, 단위, 이상/이하/초과/미만 표현을 분리해서 확인하세요."];
  if (strategy === "EXCEPTION_EXPLANATION") return [...base, `예외/관련 Fact: ${fallbackList(context.relatedFacts)}`, "본문 규칙과 예외 규칙을 각각 문장으로 다시 써 보세요."];
  if (strategy === "CONCEPT_REVIEW") return [...base, `복습 추천 Fact: ${fallbackList(context.recommendedReviewFacts)}`];
  return [...base, "정답 선택 전 문제의 부정 표현과 조건을 한 번 더 확인하세요."];
}

function nextActionFor(context: TutorResponseContext, strategy: ExplanationStrategy) {
  const recommended = context.recommendedReviewFacts.slice(0, 3);
  const suffix = recommended.length ? ` 다음 복습: ${recommended.join(", ")}.` : "";
  if (strategy === "CONCEPT_REVIEW") return `기본 개념 Fact를 먼저 복습한 뒤 같은 유형 문제를 다시 풉니다.${suffix}`;
  if (strategy === "CONFUSION_CLARIFICATION") return `혼동 Fact 두세 개를 나란히 놓고 차이점을 표시합니다.${suffix}`;
  if (strategy === "NUMERIC_EXPLANATION") return `숫자와 단위를 표로 정리한 뒤 경계값 문제를 다시 풉니다.${suffix}`;
  if (strategy === "EXCEPTION_EXPLANATION") return `예외 조건을 원칙 문장과 분리해서 암기합니다.${suffix}`;
  return `같은 문제를 천천히 다시 풀고 선택 전 조건을 체크합니다.${suffix}`;
}

function fallbackList(values: string[]) {
  return values.length ? values.join(", ") : "-";
}

function uniqueIds(ids: string[]) {
  return [...new Set(ids)];
}
