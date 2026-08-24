import type { WeatherSourceLocator } from "../source-acquisition";

export type WeatherCodeDefinition = {
  codeType: "METAR" | "SPECI" | "TAF" | "SIGMET" | "AIRMET" | "RMK";
  token: string;
  meaning: string;
  valueType: string;
  units?: string[];
  allowedValues?: string[];
  positionRules?: string[];
  dependencies?: string[];
  examples: string[];
  sourceReferences: WeatherSourceLocator[];
};

export type ParsedWeatherCodeToken = {
  token: string;
  definition?: WeatherCodeDefinition;
  status: "SUPPORTED" | "UNKNOWN_TOKEN";
};

export type ParsedWeatherCode = {
  raw: string;
  codeType: "METAR" | "SPECI" | "UNKNOWN";
  station?: string;
  time?: string;
  wind?: ParsedWeatherCodeToken;
  visibility?: ParsedWeatherCodeToken;
  weather: ParsedWeatherCodeToken[];
  cloud: ParsedWeatherCodeToken[];
  temperature?: ParsedWeatherCodeToken;
  dewPoint?: ParsedWeatherCodeToken;
  pressure?: ParsedWeatherCodeToken;
  remarks: ParsedWeatherCodeToken[];
  unknownTokens: string[];
};
