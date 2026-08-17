import type { FactQualityBenchmarkInput, PromotionThresholdSimulationResult } from "./fact-quality-benchmark";
import { benchmarkFactQuality } from "./fact-quality-sampler";
import { isFalseApproveRisk } from "./fact-risk-reclassifier";

export function simulatePromotionThresholds(
  inputs: FactQualityBenchmarkInput[],
  thresholds = [0.95, 0.92, 0.9, 0.85]
): PromotionThresholdSimulationResult[] {
  return thresholds.map((threshold) => {
    const autoApproved = inputs.filter((input) => input.promotionDecision.score >= threshold);
    const benchmarked = autoApproved.map(benchmarkFactQuality);
    const estimatedRiskCount = benchmarked.filter((result) => isFalseApproveRisk(result.riskLevel)).length;
    return {
      threshold,
      autoApproveCount: autoApproved.length,
      reviewCount: inputs.length - autoApproved.length,
      estimatedRiskCount,
      estimatedRiskRate: ratio(estimatedRiskCount, autoApproved.length)
    };
  });
}

export function recommendThreshold(results: PromotionThresholdSimulationResult[]) {
  const safe = results
    .filter((result) => result.autoApproveCount > 0)
    .toSorted((left, right) => left.estimatedRiskRate - right.estimatedRiskRate || right.autoApproveCount - left.autoApproveCount);
  return safe[0]?.threshold ?? results[0]?.threshold ?? 0.9;
}

function ratio(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 1000;
}
