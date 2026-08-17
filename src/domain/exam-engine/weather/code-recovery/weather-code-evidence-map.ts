import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherCodeEvidenceSupport = "DIRECT" | "IMPLIED_BY_STRUCTURE" | "NOT_FOUND" | "CONFLICTED";

export type WeatherCodeEvidence = {
  codeId: string;
  fieldName: "token" | "tokenPattern" | "meaning" | "valueType" | "units" |
    "position" | "dependency" | "optionality" | "example";
  sourceId: string;
  sourceLocator: WeatherSourceLocator;
  rawEvidenceText: string;
  confidence: number;
  supportStatus: WeatherCodeEvidenceSupport;
};

export type WeatherCodePositionRule = {
  codeId: string;
  sequenceIndex?: number;
  beforeToken?: string;
  afterToken?: string;
  optional: boolean;
  repeatable: boolean;
  conditionalOn?: string;
  ruleStrength: "STRICT" | "EXAMPLE_ORDER_ONLY";
  sourceReference: WeatherSourceLocator;
};

export type WeatherCodeDependency = {
  codeId: string;
  dependencyType: "REQUIRES" | "OPTIONAL_WITH" | "FOLLOWS" | "PRECEDES" |
    "CONDITIONAL_ON" | "MUTUALLY_EXCLUSIVE";
  targetCodeId: string;
  condition: string;
  required: boolean;
  sourceReference: WeatherSourceLocator;
};

export type WeatherCodeExample = {
  rawExample: string;
  parsedSegments: string[];
  targetCodeId: string;
  explanation: string;
  sourceReference: WeatherSourceLocator;
  validationStatus: "SOURCE_VERIFIED" | "BLOCKED";
};
