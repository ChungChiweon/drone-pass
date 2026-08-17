import type { CertificationRuntimeContext } from "./certification-runtime";

export class CertificationRuntimeRegistry {
  private readonly runtimes = new Map<string, CertificationRuntimeContext>();

  registerRuntime(context: CertificationRuntimeContext) {
    if (context.status !== "ready") {
      throw new Error(`Only ready runtimes can be registered: ${context.status}`);
    }
    this.runtimes.set(context.packDescriptor.packId, cloneRuntime(context));
    return context;
  }

  getRuntime(domainId: string) {
    const runtime = this.listActiveRuntimes().find((item) => item.domain.domainId === domainId);
    return runtime ? cloneRuntime(runtime) : null;
  }

  getRuntimeByPack(packId: string) {
    const runtime = this.runtimes.get(packId);
    return runtime ? cloneRuntime(runtime) : null;
  }

  listActiveRuntimes() {
    return [...this.runtimes.values()]
      .filter((runtime) => runtime.domain.status === "active" && runtime.packDescriptor.status === "active")
      .map(cloneRuntime)
      .sort((left, right) => left.domain.domainId.localeCompare(right.domain.domainId) || left.packDescriptor.packId.localeCompare(right.packDescriptor.packId));
  }
}

function cloneRuntime(context: CertificationRuntimeContext): CertificationRuntimeContext {
  return {
    ...context,
    domain: { ...context.domain },
    packDescriptor: { ...context.packDescriptor },
    packVersion: { ...context.packVersion },
    pack: {
      ...context.pack,
      sourceDocuments: [...context.pack.sourceDocuments],
      concepts: [...context.pack.concepts],
      facts: [...context.pack.facts],
      questionTemplates: [...context.pack.questionTemplates],
      examBlueprints: [...context.pack.examBlueprints]
    },
    knowledgeGraph: {
      ...context.knowledgeGraph,
      relations: [...context.knowledgeGraph.relations]
    },
    examConfig: {
      ...context.examConfig,
      difficultyDistribution: { ...context.examConfig.difficultyDistribution },
      categoryDistribution: [...context.examConfig.categoryDistribution]
    },
    learnerConfig: { ...context.learnerConfig }
  };
}
