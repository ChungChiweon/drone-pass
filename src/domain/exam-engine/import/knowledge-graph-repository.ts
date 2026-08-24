import type {
  ExamValueScore,
  KnowledgeGraphReviewStatus,
  KnowledgeRelation
} from "@/domain/exam-engine/types";

export const KNOWLEDGE_GRAPH_RELATIONS_KEY = "dronepass.knowledgeGraphRelations";
export const EXAM_VALUE_SCORES_KEY = "dronepass.examValueScores";

export type KnowledgeGraphRepository = {
  getRelations(packId: string): Promise<KnowledgeRelation[]>;
  getRelationsByFact(packId: string, factId: string): Promise<KnowledgeRelation[]>;
  saveRelation(relation: KnowledgeRelation): Promise<KnowledgeRelation>;
  saveRelations(relations: KnowledgeRelation[]): Promise<KnowledgeRelation[]>;
  updateRelationReviewStatus(id: string, status: KnowledgeGraphReviewStatus): Promise<KnowledgeRelation | null>;
  getExamValueScores(packId: string): Promise<ExamValueScore[]>;
  getExamValueScore(factId: string): Promise<ExamValueScore | null>;
  saveExamValueScore(score: ExamValueScore): Promise<ExamValueScore>;
  saveExamValueScores(scores: ExamValueScore[]): Promise<ExamValueScore[]>;
};

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readArray<T>(key: string): T[] {
  if (!canUseStorage()) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) ?? "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeArray<T>(key: string, items: T[]) {
  if (!canUseStorage()) return;
  window.localStorage.setItem(key, JSON.stringify(items));
}

function relationMatchesFact(relation: KnowledgeRelation, factId: string) {
  return relation.fromFactId === factId || relation.toFactId === factId;
}

function sameScoreIdentity(left: ExamValueScore, right: ExamValueScore) {
  return left.packId === right.packId && left.factId === right.factId;
}

export class LocalKnowledgeGraphRepository implements KnowledgeGraphRepository {
  async getRelations(packId: string) {
    return readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY).filter((relation) => relation.packId === packId);
  }

  async getRelationsByFact(packId: string, factId: string) {
    return readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY).filter((relation) => relation.packId === packId && relationMatchesFact(relation, factId));
  }

  async saveRelation(relation: KnowledgeRelation) {
    await this.saveRelations([relation]);
    return relation;
  }

  async saveRelations(relations: KnowledgeRelation[]) {
    const next = [...readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY)];
    for (const relation of relations) {
      const index = next.findIndex((item) => item.id === relation.id);
      if (index < 0) {
        next.push(relation);
      } else {
        next[index] = relation;
      }
    }
    writeArray(KNOWLEDGE_GRAPH_RELATIONS_KEY, next);
    return relations;
  }

  async updateRelationReviewStatus(id: string, status: KnowledgeGraphReviewStatus) {
    const relations = readArray<KnowledgeRelation>(KNOWLEDGE_GRAPH_RELATIONS_KEY);
    const index = relations.findIndex((relation) => relation.id === id);
    if (index < 0) return null;
    const updated = { ...relations[index], reviewStatus: status };
    relations[index] = updated;
    writeArray(KNOWLEDGE_GRAPH_RELATIONS_KEY, relations);
    return updated;
  }

  async getExamValueScores(packId: string) {
    return readArray<ExamValueScore>(EXAM_VALUE_SCORES_KEY).filter((score) => score.packId === packId);
  }

  async getExamValueScore(factId: string) {
    return readArray<ExamValueScore>(EXAM_VALUE_SCORES_KEY).find((score) => score.factId === factId) ?? null;
  }

  async saveExamValueScore(score: ExamValueScore) {
    await this.saveExamValueScores([score]);
    return score;
  }

  async saveExamValueScores(scores: ExamValueScore[]) {
    const next = [...readArray<ExamValueScore>(EXAM_VALUE_SCORES_KEY)];
    for (const score of scores) {
      const index = next.findIndex((item) => sameScoreIdentity(item, score));
      if (index < 0) {
        next.push(score);
      } else {
        next[index] = score;
      }
    }
    writeArray(EXAM_VALUE_SCORES_KEY, next);
    return scores;
  }
}

export function createLocalKnowledgeGraphRepository(): KnowledgeGraphRepository {
  return new LocalKnowledgeGraphRepository();
}
