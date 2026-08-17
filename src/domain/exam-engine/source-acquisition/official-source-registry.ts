import type { OfficialSourceMetadata } from "./official-source-metadata";
import type { OfficialSourceRegistryEntry } from "./source-acquisition-types";

export function buildOfficialSourceRegistry(metadata: readonly OfficialSourceMetadata[]): OfficialSourceRegistryEntry[] {
  const grouped = new Map<string, OfficialSourceMetadata[]>();
  for (const item of metadata) grouped.set(item.sourceId, [...(grouped.get(item.sourceId) ?? []), item]);
  return [...grouped.entries()].map(([sourceId, versions]) => ({
    sourceId,
    currentEffectiveVersionId: versions.find((item) => item.versionStatus === "CURRENT_EFFECTIVE")?.lawId ?? null,
    futureEffectiveVersionIds: versions.filter((item) => item.versionStatus === "FUTURE_EFFECTIVE").map((item) => item.lawId),
    historicalVersionIds: versions.filter((item) => item.versionStatus === "HISTORICAL").map((item) => item.lawId),
  }));
}

export function eligibleCurrentSources(metadata: readonly OfficialSourceMetadata[]) {
  return metadata.filter((item) => item.versionStatus === "CURRENT_EFFECTIVE" && item.validationStatus === "READY");
}
