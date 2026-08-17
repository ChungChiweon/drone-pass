export type FusionSourceType = "LAW" | "DECREE" | "REGULATION" | "TEXTBOOK" | "EXAM" | "GUIDELINE";
export type SourcePriority = "OFFICIAL_PRIMARY" | "OFFICIAL_SECONDARY" | "EDUCATIONAL" | "COMMUNITY";

export type KnowledgeSourceRecord = {
  sourceId: string;
  title: string;
  sourceType: FusionSourceType;
  authority: string;
  version: string;
  priority: SourcePriority;
  collectedAt: string;
};

export type KnowledgeSourceRegistry = {
  sources: KnowledgeSourceRecord[];
};

export function createKnowledgeSourceRegistry(sources: KnowledgeSourceRecord[] = []): KnowledgeSourceRegistry {
  return { sources: uniqueSources(sources) };
}

export function registerKnowledgeSource(registry: KnowledgeSourceRegistry, source: KnowledgeSourceRecord): KnowledgeSourceRegistry {
  return {
    sources: uniqueSources([...registry.sources.filter((item) => item.sourceId !== source.sourceId), source])
  };
}

export function getKnowledgeSource(registry: KnowledgeSourceRegistry, sourceId: string) {
  return registry.sources.find((source) => source.sourceId === sourceId) ?? null;
}

export function listKnowledgeSources(registry: KnowledgeSourceRegistry) {
  return [...registry.sources].sort((left, right) => left.sourceId.localeCompare(right.sourceId));
}

function uniqueSources(sources: KnowledgeSourceRecord[]) {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.sourceId)) return false;
    seen.add(source.sourceId);
    return true;
  });
}
