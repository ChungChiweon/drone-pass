import type { CandidateQualityValidation } from "./fact-quality-benchmark";
import type { BenchmarkRiskLevel } from "./fact-quality-benchmark";

export function reclassifyFactQualityRisk(validation: CandidateQualityValidation): BenchmarkRiskLevel {
  const issues = validation.issues.join(" | ");
  if (/numeric value\/unit consistency risk|condition cue exists/.test(issues) && !validation.validationSignals.articleCuePresent) {
    return "CRITICAL";
  }
  if (!validation.validationSignals.sourceValid || validation.validationSignals.duplicateRisk) return "HIGH";
  if (validation.score < 0.55 || validation.issues.length >= 4) return "HIGH";
  if (validation.score < 0.72 || validation.issues.length >= 2) return "MEDIUM";
  return "LOW";
}

export function isFalseApproveRisk(riskLevel: BenchmarkRiskLevel) {
  return riskLevel === "HIGH" || riskLevel === "CRITICAL";
}
