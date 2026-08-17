import type { SourceVersionStatus } from "./source-acquisition-types";

export function resolveLawVersionStatus(effectiveFrom: string, effectiveTo: string | undefined, targetDate: string): SourceVersionStatus {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effectiveFrom) || !/^\d{4}-\d{2}-\d{2}$/.test(targetDate)) return "UNKNOWN";
  if (effectiveFrom > targetDate) return "FUTURE_EFFECTIVE";
  if (effectiveTo && effectiveTo < targetDate) return "HISTORICAL";
  return "CURRENT_EFFECTIVE";
}

export function selectCurrentEffectiveVersion<T extends { effectiveDate: string; versionStatus: SourceVersionStatus }>(versions: readonly T[]): T | undefined {
  return versions.filter((item) => item.versionStatus === "CURRENT_EFFECTIVE").toSorted((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
}
