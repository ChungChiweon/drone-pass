import type { SourceReference } from "@/domain/exam-engine/types/knowledge";
import type { QuestionType } from "@/domain/exam-engine/types/template";

export type QuestionChoice = {
  id: string;
  text: string;
  isCorrect: boolean;
  sourceFactIds: string[];
  mutationType?: string;
};

export type QuestionGenerationTrace = {
  factId: string;
  templateId: string;
  questionType: QuestionType;
  distractorRuleIds: string[];
};

export type ValidationIssue = {
  code: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  ok: boolean;
  issues: ValidationIssue[];
};

export type GeneratedQuestion = {
  id: string;
  examId: string;
  subjectId: string;
  categoryIds: string[];
  conceptIds: string[];
  factIds: string[];
  templateId: string;
  stem: string;
  choices: QuestionChoice[];
  explanation: string;
  difficulty: "easy" | "medium" | "hard";
  sourceReferences: SourceReference[];
  generatedAt: string;
  generationSeed: string;
  validationStatus: "valid" | "invalid";
  trace: QuestionGenerationTrace;
};
