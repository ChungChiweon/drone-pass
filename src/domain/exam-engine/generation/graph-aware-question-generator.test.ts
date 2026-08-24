import { describe, expect, it } from "vitest";
import { compileQuestion } from "@/domain/exam-engine/compiler/question-compiler";
import type { AtomicFact, Concept, DistractorRule, KnowledgeRelation, QuestionTemplate } from "@/domain/exam-engine/types";
import { generateGraphAwareQuestion, GRAPH_CONTEXT_ENABLED } from "./graph-aware-question-generator";

const categoriesByConceptId = {
  "C-target": ["CAT-target"],
  "C-fallback": ["CAT-fallback"],
  "C-graph": ["CAT-graph"]
};

const conceptsById: Record<string, Concept> = {
  "C-target": { id: "C-target", subjectId: "S-1", categoryIds: ["CAT-target"], title: "Target", summary: "" },
  "C-fallback": { id: "C-fallback", subjectId: "S-1", categoryIds: ["CAT-fallback"], title: "Fallback", summary: "" },
  "C-graph": { id: "C-graph", subjectId: "S-1", categoryIds: ["CAT-graph"], title: "Graph", summary: "" }
};

const template: QuestionTemplate = {
  id: "TPL-TRUE",
  questionType: "SELECT_TRUE",
  stemTemplate: "{statement}",
  explanationTemplate: "{statement}",
  difficulty: "medium"
};

const distractorRules: DistractorRule[] = [];

function fact(overrides: Partial<AtomicFact>): AtomicFact {
  return {
    id: "AF-001",
    conceptId: "C-target",
    subject: "대상",
    predicate: "기준",
    value: "대상 값",
    statement: "대상은 기준을 충족하여야 한다.",
    conditions: [],
    exceptions: [],
    sourceReferences: [],
    version: "1",
    status: "approved",
    ...overrides
  };
}

function relation(overrides: Partial<KnowledgeRelation>): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-G1",
    relationType: "CONFUSED_WITH",
    reason: "graph distractor",
    confidence: 0.95,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "approved",
    ...overrides
  };
}

function facts() {
  return [
    fact({ id: "AF-001" }),
    fact({ id: "AF-F1", conceptId: "C-target", statement: "fallback one statement." }),
    fact({ id: "AF-F2", conceptId: "C-target", statement: "fallback two statement." }),
    fact({ id: "AF-F3", conceptId: "C-target", statement: "fallback three statement." }),
    fact({ id: "AF-G1", conceptId: "C-graph", predicate: "graph-1", statement: "graph one statement." }),
    fact({ id: "AF-G2", conceptId: "C-graph", predicate: "graph-2", statement: "graph two statement." }),
    fact({ id: "AF-G3", conceptId: "C-graph", predicate: "graph-3", statement: "graph three statement." })
  ];
}

function sourceIds(question = generate(false)) {
  return new Set(question?.choices.flatMap((choice) => choice.sourceFactIds) ?? []);
}

function generate(graphContextEnabled: boolean, relations = [
  relation({ id: "REL-G1", toFactId: "AF-G1" }),
  relation({ id: "REL-G2", toFactId: "AF-G2", relationType: "COMPARISON_PAIR" }),
  relation({ id: "REL-G3", toFactId: "AF-G3", relationType: "COMPARISON_PAIR" })
]) {
  return generateGraphAwareQuestion({
    factId: "AF-001",
    examId: "exam",
    subjectId: "S-1",
    categoriesByConceptId,
    conceptsById,
    facts: facts(),
    template,
    distractorRules,
    seed: "seed",
    relations,
    scores: [],
    graphContextEnabled
  });
}

describe("generateGraphAwareQuestion", () => {
  it("keeps the graph feature flag off by default", () => {
    expect(GRAPH_CONTEXT_ENABLED).toBe(false);
  });

  it("keeps existing compiler output when graph context is disabled", () => {
    const base = compileQuestion({
      examId: "exam",
      subjectId: "S-1",
      categoriesByConceptId,
      conceptsById,
      facts: facts(),
      fact: facts()[0],
      template,
      distractorRules,
      seed: "seed"
    });
    const graphAwareOff = generate(false);

    expect(graphAwareOff?.choices.map((choice) => choice.text)).toEqual(base?.choices.map((choice) => choice.text));
  });

  it("uses graph allowed distractor candidates when explicitly enabled", () => {
    const ids = sourceIds(generate(true));

    expect(ids.has("AF-G1")).toBe(true);
    expect(ids.has("AF-G2")).toBe(true);
  });

  it("excludes rejected graph relations from graph distractors", () => {
    const ids = sourceIds(generate(true, [
      relation({ id: "REL-G1", toFactId: "AF-G1", reviewStatus: "rejected" }),
      relation({ id: "REL-G2", toFactId: "AF-G2", relationType: "COMPARISON_PAIR" }),
      relation({ id: "REL-G3", toFactId: "AF-G3", relationType: "COMPARISON_PAIR" })
    ]));

    expect(ids.has("AF-G1")).toBe(false);
    expect(ids.has("AF-G2")).toBe(true);
  });
});
