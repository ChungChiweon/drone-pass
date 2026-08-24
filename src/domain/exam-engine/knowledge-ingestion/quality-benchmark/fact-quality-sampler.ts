import type { FactQualityBenchmarkInput, FactQualityBenchmarkResult, FactQualityGrade, FactQualitySampleReport, BenchmarkRiskLevel } from "./fact-quality-benchmark";
import { validateAutoApproveCandidate } from "./auto-approve-validator";
import { isFalseApproveRisk, reclassifyFactQualityRisk } from "./fact-risk-reclassifier";

export function benchmarkFactQuality(input: FactQualityBenchmarkInput): FactQualityBenchmarkResult {
  const validation = validateAutoApproveCandidate(input.candidate, input.duplicateResult, input.sourceType);
  const riskLevel = reclassifyFactQualityRisk(validation);
  return {
    candidateId: input.candidate.candidateId,
    promotionDecision: input.promotionDecision.decision,
    score: validation.score,
    qualityGrade: gradeFor(validation.score, riskLevel),
    riskLevel,
    validationSignals: validation.validationSignals,
    issues: validation.issues
  };
}

export function analyzeFactQualitySamples(inputs: FactQualityBenchmarkInput[], minimumPerGroup = 30): FactQualitySampleReport[] {
  const byDecision = groupByDecision(inputs);
  return Object.entries(byDecision).map(([group, groupInputs]) => {
    const samples = sampleDeterministically(groupInputs, minimumPerGroup).map(benchmarkFactQuality);
    const risky = samples.filter((sample) => isFalseApproveRisk(sample.riskLevel));
    const issueCount = samples.filter((sample) => sample.issues.length > 0).length;
    const passCount = samples.filter((sample) => sample.qualityGrade === "EXCELLENT" || sample.qualityGrade === "GOOD").length;
    return {
      group: group as FactQualitySampleReport["group"],
      sampleSize: samples.length,
      passRate: ratio(passCount, samples.length),
      issueRate: ratio(issueCount, samples.length),
      falseApproveRiskRate: ratio(risky.length, samples.length),
      gradeDistribution: gradeDistribution(samples),
      riskDistribution: riskDistribution(samples),
      samples
    };
  });
}

export function gradeFor(score: number, riskLevel: BenchmarkRiskLevel): FactQualityGrade {
  if (riskLevel === "CRITICAL" || riskLevel === "HIGH" || score < 0.55) return "POOR";
  if (score >= 0.88) return "EXCELLENT";
  if (score >= 0.74) return "GOOD";
  return "ACCEPTABLE";
}

function groupByDecision(inputs: FactQualityBenchmarkInput[]) {
  return inputs.reduce<Record<string, FactQualityBenchmarkInput[]>>((acc, input) => {
    acc[input.promotionDecision.decision] = acc[input.promotionDecision.decision] ?? [];
    acc[input.promotionDecision.decision].push(input);
    return acc;
  }, {});
}

function sampleDeterministically(inputs: FactQualityBenchmarkInput[], minimum: number) {
  if (inputs.length <= minimum) return inputs;
  const sorted = [...inputs].sort((left, right) => left.candidate.candidateId.localeCompare(right.candidate.candidateId));
  const step = Math.max(1, Math.floor(sorted.length / minimum));
  const sampled = sorted.filter((_, index) => index % step === 0).slice(0, minimum);
  return sampled.length >= minimum ? sampled : sorted.slice(0, minimum);
}

function gradeDistribution(samples: FactQualityBenchmarkResult[]): Record<FactQualityGrade, number> {
  return {
    EXCELLENT: samples.filter((sample) => sample.qualityGrade === "EXCELLENT").length,
    GOOD: samples.filter((sample) => sample.qualityGrade === "GOOD").length,
    ACCEPTABLE: samples.filter((sample) => sample.qualityGrade === "ACCEPTABLE").length,
    POOR: samples.filter((sample) => sample.qualityGrade === "POOR").length
  };
}

function riskDistribution(samples: FactQualityBenchmarkResult[]): Record<BenchmarkRiskLevel, number> {
  return {
    LOW: samples.filter((sample) => sample.riskLevel === "LOW").length,
    MEDIUM: samples.filter((sample) => sample.riskLevel === "MEDIUM").length,
    HIGH: samples.filter((sample) => sample.riskLevel === "HIGH").length,
    CRITICAL: samples.filter((sample) => sample.riskLevel === "CRITICAL").length
  };
}

function ratio(value: number, total: number) {
  if (!total) return 0;
  return Math.round((value / total) * 1000) / 1000;
}
