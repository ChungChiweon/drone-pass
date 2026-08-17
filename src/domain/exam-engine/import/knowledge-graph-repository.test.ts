// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import type { ExamValueScore, KnowledgePack, KnowledgeRelation } from "@/domain/exam-engine/types";
import {
  cacheKnowledgePack,
  createLocalKnowledgePackRepository
} from "./local-knowledge-pack-repository";
import {
  EXAM_VALUE_SCORES_KEY,
  KNOWLEDGE_GRAPH_RELATIONS_KEY,
  LocalKnowledgeGraphRepository
} from "./knowledge-graph-repository";

function relation(overrides: Partial<KnowledgeRelation> = {}): KnowledgeRelation {
  return {
    id: "REL-1",
    packId: "pack-a",
    fromFactId: "AF-001",
    toFactId: "AF-002",
    relationType: "RELATED",
    reason: "same regulatory topic",
    confidence: 0.8,
    createdAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

function score(overrides: Partial<ExamValueScore> = {}): ExamValueScore {
  return {
    packId: "pack-a",
    factId: "AF-001",
    frequencyScore: 3,
    confusionScore: 4,
    importanceScore: 5,
    numericRiskScore: 2,
    penaltyRiskScore: 1,
    difficultyScore: 3,
    overallScore: 18,
    reason: "high exam value",
    updatedAt: "2026-07-27T00:00:00.000Z",
    reviewStatus: "draft",
    ...overrides
  };
}

function knowledgePack(): KnowledgePack {
  return {
    domainPack: {
      exams: [{ id: "exam", title: "Exam", countryCode: "KR", description: "", subjectIds: ["S-1"] }],
      subjects: [{ id: "S-1", examId: "exam", title: "Subject", description: "", categoryIds: ["CAT-1"] }],
      categories: [{ id: "CAT-1", subjectId: "S-1", title: "Category" }]
    },
    sourceDocuments: [],
    sourceRevisions: [],
    concepts: [{ id: "C-1", subjectId: "S-1", categoryIds: ["CAT-1"], title: "Concept", summary: "" }],
    atomicFacts: [{
      id: "AF-001",
      conceptId: "C-1",
      subject: "subject",
      predicate: "predicate",
      value: "value",
      statement: "statement",
      conditions: [],
      exceptions: [],
      sourceReferences: [],
      version: "1",
      status: "draft"
    }],
    questionTemplates: [],
    distractorRules: []
  };
}

beforeEach(() => window.localStorage.clear());

describe("LocalKnowledgeGraphRepository", () => {
  it("saves and reads relations by pack", async () => {
    const repository = new LocalKnowledgeGraphRepository();
    const saved = relation();
    await repository.saveRelation(saved);

    expect(await repository.getRelations("pack-a")).toEqual([saved]);
    expect(await repository.getRelations("pack-b")).toEqual([]);
    expect(JSON.parse(window.localStorage.getItem(KNOWLEDGE_GRAPH_RELATIONS_KEY) ?? "[]")).toHaveLength(1);
  });

  it("finds incoming and outgoing relations by fact without crossing pack boundaries", async () => {
    const repository = new LocalKnowledgeGraphRepository();
    const outgoing = relation({ id: "REL-1", fromFactId: "AF-001", toFactId: "AF-002" });
    const incoming = relation({ id: "REL-2", fromFactId: "AF-003", toFactId: "AF-001" });
    const otherPack = relation({ id: "REL-3", packId: "pack-b", fromFactId: "AF-001", toFactId: "AF-004" });
    await repository.saveRelations([outgoing, incoming, otherPack]);

    expect(await repository.getRelationsByFact("pack-a", "AF-001")).toEqual([outgoing, incoming]);
  });

  it("updates relation review status without changing the relation identity", async () => {
    const repository = new LocalKnowledgeGraphRepository();
    await repository.saveRelation(relation({ reviewStatus: "draft" }));

    const updated = await repository.updateRelationReviewStatus("REL-1", "reviewed");

    expect(updated).toMatchObject({ id: "REL-1", reviewStatus: "reviewed" });
    expect(await repository.updateRelationReviewStatus("missing", "approved")).toBeNull();
  });

  it("saves and upserts exam value scores by pack and fact", async () => {
    const repository = new LocalKnowledgeGraphRepository();
    await repository.saveExamValueScore(score());
    await repository.saveExamValueScore(score({ overallScore: 21, reason: "updated" }));
    await repository.saveExamValueScore(score({ packId: "pack-b", overallScore: 9 }));

    expect(await repository.getExamValueScores("pack-a")).toEqual([score({ overallScore: 21, reason: "updated" })]);
    expect(await repository.getExamValueScores("pack-b")).toEqual([score({ packId: "pack-b", overallScore: 9 })]);
    expect(await repository.getExamValueScore("AF-001")).toMatchObject({ factId: "AF-001" });
    expect(JSON.parse(window.localStorage.getItem(EXAM_VALUE_SCORES_KEY) ?? "[]")).toHaveLength(2);
  });

  it("does not affect existing KnowledgePack local load", async () => {
    cacheKnowledgePack({
      id: "pack-a",
      name: "Pack A",
      importedAt: "2026-07-27T00:00:00.000Z",
      pack: knowledgePack()
    }, true);

    const graphRepository = new LocalKnowledgeGraphRepository();
    await graphRepository.saveRelation(relation());
    await graphRepository.saveExamValueScore(score());

    const packRepository = createLocalKnowledgePackRepository();
    const active = await packRepository.getActive();

    expect(active?.id).toBe("pack-a");
    expect(active?.pack.atomicFacts).toHaveLength(1);
    expect(active?.pack.atomicFacts[0]?.status).toBe("draft");
  });
});
