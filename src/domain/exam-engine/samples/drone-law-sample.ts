import type { AtomicFact, Concept, DistractorRule, DomainPack, QuestionTemplate, SourceDocument, SourceRevision } from "@/domain/exam-engine/types";

export const droneLawDomainPack: DomainPack = {
  exams: [
    {
      id: "kr-drone-license",
      title: "드론 자격시험 학습용 샘플",
      countryCode: "KR",
      description: "공식 출제 문제가 아닌 동적 문제 생성 엔진 검증용 도메인입니다.",
      subjectIds: ["kr-drone-law"]
    }
  ],
  subjects: [
    {
      id: "kr-drone-law",
      examId: "kr-drone-license",
      title: "항공안전법 샘플",
      description: "초경량비행장치 안전 운용 학습을 위한 샘플 과목입니다.",
      categoryIds: ["drone-preflight", "drone-weather", "drone-operation"]
    }
  ],
  categories: [
    { id: "drone-preflight", subjectId: "kr-drone-law", title: "비행 전 점검" },
    { id: "drone-weather", subjectId: "kr-drone-law", title: "비행 조건" },
    { id: "drone-operation", subjectId: "kr-drone-law", title: "안전 운용" }
  ]
};

export const sampleSourceDocuments: SourceDocument[] = [
  {
    id: "sample-drone-study-note",
    title: "드론패스 엔진 검증용 샘플 노트",
    publisher: "Drone Pass Team",
    note: "현행 법령 또는 공식 정답 데이터가 아닌 구조 테스트용 샘플입니다."
  }
];

export const sampleSourceRevisions: SourceRevision[] = [
  {
    id: "sample-drone-study-note-v1",
    documentId: "sample-drone-study-note",
    label: "sample-v1",
    publishedAt: "2026-07-14"
  }
];

export const sampleConcepts: Concept[] = [
  { id: "concept-preflight-check", subjectId: "kr-drone-law", categoryIds: ["drone-preflight"], title: "비행 전 점검", summary: "비행 전 기체와 주변 환경을 확인합니다." },
  { id: "concept-weather-check", subjectId: "kr-drone-law", categoryIds: ["drone-weather"], title: "비행 기상 판단", summary: "풍속, 강수, 시정 저하를 보수적으로 판단합니다." },
  { id: "concept-battery-safety", subjectId: "kr-drone-law", categoryIds: ["drone-preflight"], title: "배터리 안전", summary: "저전압과 외관 손상을 확인합니다." },
  { id: "concept-site-control", subjectId: "kr-drone-law", categoryIds: ["drone-operation"], title: "현장 통제", summary: "사람과 장애물 주변에서 안전거리를 확보합니다." },
  { id: "concept-failsafe", subjectId: "kr-drone-law", categoryIds: ["drone-operation"], title: "비상 대응", summary: "신호 손실과 이상 경고에 대비합니다." }
];

const sampleSource = [{ documentId: "sample-drone-study-note", revisionId: "sample-drone-study-note-v1", locator: "sample fact", note: "구조 검증용 샘플" }];

export const sampleAtomicFacts: AtomicFact[] = [
  {
    id: "fact-preflight-combined-check",
    conceptId: "concept-preflight-check",
    subject: "조종자",
    predicate: "비행 전 확인",
    value: "기체 상태, 배터리, 주변 장애물, 기상 조건",
    statement: "드론 비행 전에는 기체 상태, 배터리, 주변 장애물, 기상 조건을 함께 확인한다.",
    conditions: [{ id: "condition-before-takeoff", statement: "이륙 전" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-weather-wind-rain-visibility",
    conceptId: "concept-weather-check",
    subject: "비행 조건",
    predicate: "확인 항목",
    value: "풍속, 돌풍, 강수, 시정",
    statement: "비행 가능 여부를 판단할 때 풍속, 돌풍, 강수, 시정을 함께 확인한다.",
    conditions: [{ id: "condition-before-flight", statement: "비행 계획 수립 시" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-low-battery-return",
    conceptId: "concept-battery-safety",
    subject: "저전압 경고",
    predicate: "우선 조치",
    value: "복귀 또는 착륙",
    statement: "저전압 경고가 발생하면 촬영 지속보다 복귀 또는 안전 착륙을 우선한다.",
    conditions: [{ id: "condition-low-voltage", statement: "비행 중 저전압 경고 발생" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-crowd-distance",
    conceptId: "concept-site-control",
    subject: "현장 통제",
    predicate: "안전거리",
    value: "사람, 차량, 건물, 전선",
    statement: "비행 현장에서는 사람, 차량, 건물, 전선과의 안전거리를 확보한다.",
    conditions: [{ id: "condition-field-operation", statement: "야외 비행 시" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-home-point-rth",
    conceptId: "concept-failsafe",
    subject: "자동 복귀",
    predicate: "사전 확인",
    value: "홈포인트와 복귀 고도",
    statement: "자동 복귀 기능을 사용하기 전에는 홈포인트와 복귀 고도 설정을 확인한다.",
    conditions: [{ id: "condition-rth-enabled", statement: "자동 복귀 기능 사용 전" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-damaged-propeller-stop",
    conceptId: "concept-preflight-check",
    subject: "프로펠러",
    predicate: "손상 대응",
    value: "비행 중지 및 교체",
    statement: "프로펠러에 균열이나 변형이 있으면 비행하지 않고 교체한다.",
    conditions: [{ id: "condition-propeller-damaged", statement: "비행 전 프로펠러 손상 발견" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-visual-line-of-sight",
    conceptId: "concept-site-control",
    subject: "기체 식별",
    predicate: "기본 원칙",
    value: "시야 확보",
    statement: "비행 중에는 기체의 위치와 방향을 식별할 수 있도록 시야를 확보한다.",
    conditions: [{ id: "condition-during-flight", statement: "비행 중" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-signal-loss-response",
    conceptId: "concept-failsafe",
    subject: "신호 약화",
    predicate: "대응",
    value: "복귀 또는 착륙 준비",
    statement: "조종 신호가 약해지면 기체를 안정화하고 복귀 또는 착륙을 준비한다.",
    conditions: [{ id: "condition-signal-weak", statement: "조종 신호 약화" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-precipitation-stop",
    conceptId: "concept-weather-check",
    subject: "강수",
    predicate: "비행 판단",
    value: "비행 보류",
    statement: "비나 눈이 내리는 조건에서는 기체 손상과 시야 저하 가능성을 고려해 비행을 보류한다.",
    conditions: [{ id: "condition-precipitation", statement: "강수 발생" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  },
  {
    id: "fact-emergency-landing-zone",
    conceptId: "concept-failsafe",
    subject: "비상 착륙",
    predicate: "사전 준비",
    value: "개방된 착륙 지점",
    statement: "비행 전에는 비상 착륙에 사용할 수 있는 개방된 지점을 확인한다.",
    conditions: [{ id: "condition-before-takeoff", statement: "이륙 전" }],
    exceptions: [],
    sourceReferences: sampleSource,
    version: "sample-v1",
    status: "approved"
  }
];

export const sampleQuestionTemplates: QuestionTemplate[] = [
  {
    id: "template-select-true-basic",
    questionType: "SELECT_TRUE",
    stemTemplate: "다음 중 {concept}에 대한 설명으로 옳은 것은?",
    explanationTemplate: "{statement}",
    difficulty: "easy"
  },
  {
    id: "template-select-false-basic",
    questionType: "SELECT_FALSE",
    stemTemplate: "다음 중 {concept}에 대한 설명으로 옳지 않은 것은?",
    explanationTemplate: "옳지 않은 선택지는 핵심 조건을 바꾼 문장입니다. 기준 설명: {statement}",
    difficulty: "medium"
  },
  {
    id: "template-case-judgment",
    questionType: "CASE_JUDGMENT",
    stemTemplate: "상황 판단 문제입니다. {condition} 가장 적절한 조치는?",
    explanationTemplate: "{statement}",
    difficulty: "medium"
  },
  {
    id: "template-concept-comparison",
    questionType: "CONCEPT_COMPARISON",
    stemTemplate: "{concept}와 관련해 우선 확인해야 할 항목은?",
    explanationTemplate: "{statement}",
    difficulty: "easy"
  },
  {
    id: "template-numeric-threshold-placeholder",
    questionType: "NUMERIC_THRESHOLD",
    stemTemplate: "{concept}에서 수치 조건을 판단할 때 가장 안전한 접근은?",
    explanationTemplate: "{statement}",
    difficulty: "hard"
  }
];

export const sampleDistractorRules: DistractorRule[] = [
  { id: "rule-numeric-nearby", mutationType: "NUMERIC_NEARBY", description: "숫자 기준을 근처 값으로 바꿉니다." },
  { id: "rule-boundary-operator-swap", mutationType: "BOUNDARY_OPERATOR_SWAP", description: "이상/초과 같은 경계 연산자를 바꿉니다." },
  { id: "rule-unit-swap", mutationType: "UNIT_SWAP", description: "단위 또는 확인 항목을 바꿉니다." },
  { id: "rule-authority-swap", mutationType: "AUTHORITY_SWAP", description: "행위 주체나 판단 주체를 바꿉니다." },
  { id: "rule-condition-omission", mutationType: "CONDITION_OMISSION", description: "필수 조건을 생략합니다." },
  { id: "rule-exception-omission", mutationType: "EXCEPTION_OMISSION", description: "예외 조건을 생략합니다." },
  { id: "rule-sibling-fact-swap", mutationType: "SIBLING_FACT_SWAP", description: "인접 개념의 문장을 끌어와 혼동을 만듭니다." }
];
