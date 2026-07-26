import type { DomainPack } from "./exam";
import type { AtomicFact, Concept, SourceDocument, SourceRevision } from "./knowledge";
import type { DistractorRule, QuestionTemplate } from "./template";

export type KnowledgePack = {
  domainPack: DomainPack;
  sourceDocuments: SourceDocument[];
  sourceRevisions: SourceRevision[];
  concepts: Concept[];
  atomicFacts: AtomicFact[];
  questionTemplates: QuestionTemplate[];
  distractorRules: DistractorRule[];
};
