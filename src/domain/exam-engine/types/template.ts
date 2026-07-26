export type QuestionType = "SELECT_TRUE" | "SELECT_FALSE" | "NUMERIC_THRESHOLD" | "CONCEPT_COMPARISON" | "CASE_JUDGMENT";

export type DifficultyPolicy = {
  level: "easy" | "medium" | "hard";
  distractorCount: number;
};

export type QuestionTemplate = {
  id: string;
  questionType: QuestionType;
  stemTemplate: string;
  explanationTemplate: string;
  difficulty: DifficultyPolicy["level"];
};

export type DistractorRule = {
  id: string;
  mutationType:
    | "NUMERIC_NEARBY"
    | "BOUNDARY_OPERATOR_SWAP"
    | "UNIT_SWAP"
    | "AUTHORITY_SWAP"
    | "CONDITION_OMISSION"
    | "EXCEPTION_OMISSION"
    | "SIBLING_FACT_SWAP";
  description: string;
};
